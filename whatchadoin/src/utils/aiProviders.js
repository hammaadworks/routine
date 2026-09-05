export async function sendToProvider(messages, appState, tools, config) {
  const { provider, apiKey, model, customEndpoint } = config;

  const systemMessage = {
    role: 'system',
    content: `You are an AI assistant controlling the "whatchadoin" application.
You have the ability to execute tools to change the application state.
Do NOT guess IDs. Use the current state to find IDs.
Current Application State:
${JSON.stringify(appState, null, 2)}`
  };

  const formattedMessages = [systemMessage, ...messages];

  if (!['openai', 'custom', 'groq', 'gemini'].includes(provider)) {
    throw new Error(`Provider ${provider} is not supported.`);
  }

  let endpoint = 'https://api.openai.com/v1/chat/completions';
  if (provider === 'custom') endpoint = customEndpoint;
  if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  if (provider === 'gemini') endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: formattedMessages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: 'auto'
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const message = data.choices[0].message;

  if (message.tool_calls && message.tool_calls.length > 0) {
    return {
      type: 'tool_call',
      message: message, 
      toolCalls: message.tool_calls
    };
  }

  return {
    type: 'text',
    message: message 
  };
}
