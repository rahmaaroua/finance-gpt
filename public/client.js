const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

function addMessage(content, role) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper';

  const msg = document.createElement('div');
  msg.className = `message ${role}`;
  msg.textContent = content;

  wrapper.appendChild(msg);
  messages.appendChild(wrapper);
  messages.scrollTop = messages.scrollHeight;

  return msg;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const userMsg = addMessage(text, 'user');
  input.value = '';

  const botMsg = addMessage('', 'bot');

  const response = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n\n');
    buffer = lines.pop() || ''; // Save the last incomplete chunk

    for (const line of lines) {
      if (line.startsWith('data:')) {
        const data = line.replace('data: ', '').trim();
        if (data === '[DONE]') return;
        botMsg.textContent += data;
        messages.scrollTop = messages.scrollHeight;
      }
    }
  }
});
