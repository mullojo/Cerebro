export const tokens = ['firstName', 'name', 'email', 'title', 'organization', 'website', 'instagram', 'personalNote', 'senderName', 'productUrl'];
export function personalize(text, values) {
  const missing = new Set();
  const output = text.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g, (match, key) => {
    const value = String(values[key] || '').trim();
    if (!value) missing.add(key);
    return value || match;
  });
  return { text: output, missing: [...missing] };
}
export function initialState() {
  const openings = [
    ['Feedback', 'Could you review our community project?', 'We are testing a small community project and would value your feedback. You can find it here: {{productUrl}}'],
    ['Collaboration', 'An idea for working together', 'Would you be interested in exploring a collaboration around this project? {{productUrl}}'],
    ['Invitation', 'An invitation to our project session', 'We are planning a session to share what we are learning. The project overview is here: {{productUrl}}'],
    ['Follow-up', 'Following up on our conversation', 'Thank you for considering the project. Is there more context we could provide? {{productUrl}}'],
    ['Thank you', 'Thank you for your feedback', 'Thank you for sharing your perspective. We will use it to shape the next iteration: {{productUrl}}'],
    ['Introduction', 'A small project to share', 'We are working on a practical tool for our community. Would you like to take a look? {{productUrl}}'],
  ];
  return { revision: 0, contacts: [], drafts: [], templates: openings.map(([name, subject, body], i) => ({ id: `starter-${i + 1}`, name, subject, body: `Hi {{firstName}},\n\n{{personalNote}}\n\n${body}\n\nWarmly,\n{{senderName}}` })) };
}
