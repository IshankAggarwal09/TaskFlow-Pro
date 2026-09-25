const express = require('express');
const pool = require('../db/index');
const router = express.Router();

router.post('/:id/ai-suggestions', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const taskRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const task = taskRes.rows[0];

    const otherTasksRes = await pool.query('SELECT * FROM tasks WHERE id != $1', [id]);
    const otherTasks = otherTasksRes.rows;

    const systemPrompt = "You are a project management assistant. Your job is to analyze task descriptions and suggest which tasks a given task likely depends on. You must only suggest tasks from the provided list. Return ONLY a valid JSON array with no markdown, no explanation, no preamble. If no dependencies are clear, return an empty array [].";

    const userPrompt = `Target task that needs dependency suggestions:
ID: ${task.id}
Title: ${task.title}
Description: ${task.description || ''}

Available tasks to choose from:
${otherTasks.map(t => `ID: ${t.id}\nTitle: ${t.title}\nDescription: ${t.description || ''}`).join('\n\n')}

Return a JSON array of objects. Each object must have exactly these fields:
- taskId: the UUID of the task this target depends on (must be from the list above)
- rationale: one sentence explaining why this dependency is likely

Return only the JSON array. No other text.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
        'x-api-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error('Anthropic API error: ' + JSON.stringify(data));
    }

    const textContent = data.content && data.content.length > 0 ? data.content[0].text : '[]';
    
    let parsedArray;
    try {
      parsedArray = JSON.parse(textContent);
      if (!Array.isArray(parsedArray)) throw new Error('Not an array');
    } catch (e) {
      throw new Error('Failed to parse AI response as JSON');
    }

    const validTaskIds = new Set(otherTasks.map(t => t.id));
    const validatedArray = parsedArray.filter(item => 
      item && typeof item === 'object' && 
      item.taskId && validTaskIds.has(item.taskId) &&
      item.rationale
    ).map(item => ({
      taskId: item.taskId,
      rationale: item.rationale
    }));

    res.status(200).json({ suggestions: validatedArray });
  } catch (error) {
    console.error('AI Suggestion Error:', error);
    res.status(200).json({ suggestions: [], error: 'AI suggestions temporarily unavailable' });
  }
});

module.exports = router;
