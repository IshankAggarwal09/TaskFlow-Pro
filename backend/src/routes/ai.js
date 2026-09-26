const express = require('express');
const pool = require('../db/index');
const https = require('https');
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

    const userPrompt = `You are a project management assistant. Analyze these tasks and suggest which tasks the target task likely depends on. Return ONLY a valid JSON array with no markdown, no explanation, no preamble. If no dependencies are clear, return an empty array [].

Target task:
ID: ${task.id}
Title: ${task.title}
Description: ${task.description || ''}

Available tasks to choose from:
${otherTasks.map(t => `ID: ${t.id}\nTitle: ${t.title}\nDescription: ${t.description || ''}`).join('\n\n')}

Return a JSON array of objects. Each object must have exactly:
- taskId: the UUID from the list above that the target task depends on
- rationale: one sentence explaining why this dependency makes sense

Return only the JSON array. No other text. No markdown.`;

    const requestBody = JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const apiKey = process.env.GROQ_API_KEY;

    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const request = https.request(options, (response) => {
        let body = '';
        response.on('data', (chunk) => body += chunk);
        response.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (response.statusCode >= 200 && response.statusCode < 300) {
              resolve(parsed);
            } else {
              console.error('Groq error response:', parsed);
              reject(new Error(parsed.error?.message || 'Groq API error'));
            }
          } catch (e) {
            console.error('Raw response:', body);
            reject(new Error('Invalid JSON from Groq'));
          }
        });
      });

      request.on('error', (e) => {
        console.error('HTTPS request error:', e);
        reject(e);
      });
      request.write(requestBody);
      request.end();
    });

    const textContent = data?.choices?.[0]?.message?.content || '[]';

    let cleanJson = textContent.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedArray;
    try {
      parsedArray = JSON.parse(cleanJson);
      if (!Array.isArray(parsedArray)) throw new Error('Not an array');
    } catch (e) {
      console.error('JSON parse error:', cleanJson);
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
    console.error('AI Suggestion Error:', error.message);
    res.status(200).json({ suggestions: [], error: 'AI suggestions temporarily unavailable' });
  }
});

module.exports = router;
