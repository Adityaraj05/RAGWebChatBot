export async function callLLM(
    provider: string,
    apiKey: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string
): Promise<string> {
    if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'system', content: systemPrompt }, ...messages]
            })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error?.message || 'OpenAI API error');
        }

        const data = await res.json();
        return data.choices[0].message.content;
    }

    if (provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                system: systemPrompt,
                messages,
                max_tokens: 1024
            })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error?.message || 'Anthropic API error');
        }

        const data = await res.json();
        return data.content[0].text;
    }

    if (provider === 'google') {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: messages.map(m => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    }))
                })
            }
        );

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error?.message || 'Google API error');
        }

        const data = await res.json();
        return data.candidates[0].content.parts[0].text;
    }

    throw new Error(`Provider "${provider}" not supported`);
}
