const fs = require('fs');
const path = require('path');

const filePath = path.join('/home/rudh/code/alternative/frontend/src/components/ChatRoom.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Wrap toggleReaction with useCallback
content = content.replace(
  /const toggleReaction = \((.*?)\) => {([\s\S]*?)};\n/m,
  'const toggleReaction = useCallback(($1) => {$2}, [sendMessage]);\n'
);

// 2. Wrap retryMessage with useCallback
content = content.replace(
  /const retryMessage = \((.*?)\) => {([\s\S]*?)  };\n/m,
  'const retryMessage = useCallback(($1) => {$2  }, [sendMessage]);\n'
);

// 3. Update ChatRoom component to remove unused refs/state that go to InputBar
content = content.replace(/const \[text, setText\] = useState\(""\);\n/, '');
content = content.replace(/const myTypingTimeoutRef = useRef<NodeJS\.Timeout \| null>\(null\);\n/, '');
content = content.replace(/const fileInputRef = useRef<HTMLInputElement>\(null\);\n/, '');
content = content.replace(/const inputRef = useRef<HTMLInputElement>\(null\);\n/, '');

// 4. Update handleSend to take text and not clear input/refs
content = content.replace(
  /const handleSend = \(\) => {\n\s*if \(!text\.trim\(\)\) return;/m,
  'const handleSend = useCallback((text: string) => {\n    if (!text.trim()) return;'
);
content = content.replace(/setText\(""\);\n\s*setReplyingTo\(null\);\n\s*vibrate\(10\);\n\s*inputRef\.current\?\.focus\(\);\n/, 'setReplyingTo(null);\n    vibrate(10);\n');
content = content.replace(/const handleSend = useCallback\([\s\S]*?}, \[sendMessage\]\);\n/m, (match) => match.replace('};', '}, [replyingTo, sendMessage, userId]);')); // We need to handle this manually below

// Wait, doing this via regex is very brittle. Let's do it explicitly.
