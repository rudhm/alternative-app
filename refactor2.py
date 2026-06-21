import re

with open('frontend/src/components/ChatRoom.tsx', 'r') as f:
    content = f.read()

# 1. Add imports
content = content.replace(
    'import { motion } from "framer-motion";\nimport { cn } from "@/lib/utils";',
    'import { motion } from "framer-motion";\nimport { cn } from "@/lib/utils";\nimport { MessageBubble } from "./MessageBubble";\nimport { MessageInputBar } from "./MessageInputBar";'
)

# 2. Update toggleReaction and retryMessage with useCallback
content = re.sub(
    r'const toggleReaction = \(msgId: string, emoji: string\) => \{([\s\S]*?)\};',
    r'const toggleReaction = useCallback((msgId: string, emoji: string) => {\1}, [sendMessage]);',
    content
)
content = re.sub(
    r'const retryMessage = \(msg: any\) => \{([\s\S]*?)  \};\n',
    r'const retryMessage = useCallback((msg: any) => {\1  }, [sendMessage]);\n',
    content
)

# 3. Update handleTap
content = re.sub(
    r'const handleTap = \(msgId: string\) => \{([\s\S]*?)  \};',
    r'const handleTap = useCallback((msgId: string) => {\1  }, [messages, userId, toggleReaction]);',
    content
)

# 4. Remove handlePressStart and handlePressEnd
content = re.sub(r'  const pressTimer = useRef<NodeJS\.Timeout \| null>\(null\);\n\n  const handlePressStart = \([\s\S]*?  \};\n\n  const handlePressEnd = \(\) => \{\n    if \(pressTimer\.current\) clearTimeout\(pressTimer\.current\);\n  \};\n\n', '', content)

# 5. Remove unused state and refs
content = content.replace('  const [text, setText] = useState("");\n', '')
content = content.replace('  const myTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);\n', '')
content = content.replace('  const fileInputRef = useRef<HTMLInputElement>(null);\n', '')
content = content.replace('  const inputRef = useRef<HTMLInputElement>(null);\n', '')

# 6. Update handleFileUpload
content = content.replace('const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {', 'const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {')
content = content.replace('vibrate(10);\n  };', 'vibrate(10);\n  }, [replyingTo, sendMessage, userId]);')

# 7. Update handleSend
content = re.sub(
    r'const handleSend = \(\) => \{\n\s*if \(!text\.trim\(\)\) return;\n',
    'const handleSend = useCallback((text: string) => {\n    if (!text.trim()) return;\n',
    content
)
content = content.replace('setText("");\n    setReplyingTo(null);\n    vibrate(10);\n    inputRef.current?.focus();\n', 'setReplyingTo(null);\n    vibrate(10);\n')
content = re.sub(
    r'      \}\);\n    \}, 5000\);\n  \};\n',
    '      });\n    }, 5000);\n  }, [replyingTo, sendMessage, userId]);\n',
    content
)

# 8. Add handleTyping
handle_typing = """  const handleTyping = useCallback(() => {
    sendMessage({ type: "typing", payload: {} });
  }, [sendMessage]);
"""
content = content.replace('const handleSend = useCallback((text: string) => {', handle_typing + '\n  const handleSend = useCallback((text: string) => {')

# 9. Add overscroll-behavior
content = content.replace(
    'className="flex-1 overflow-y-auto px-3 sm:px-4 pt-3 pb-28 select-none [-webkit-touch-callout:none]"',
    'className="flex-1 overflow-y-auto px-3 sm:px-4 pt-3 pb-28 select-none [-webkit-touch-callout:none]" style={{ overscrollBehavior: "contain" }}'
)

# 10. Replace map loop body
target_to_replace = re.compile(r'<motion\.div \n\s*drag="x"[\s\S]*?</motion\.div>', re.MULTILINE)

bubble_usage = """<MessageBubble 
                  msg={msg}
                  userId={userId}
                  isNew={isNew}
                  activeReactionId={activeReactionId}
                  onSetReplyingTo={setReplyingTo}
                  onSetActiveReactionId={setActiveReactionId}
                  onRetryMessage={retryMessage}
                  onToggleReaction={toggleReaction}
                />"""

# Replace ONLY the first match (the one in the virtualizer loop)
content = target_to_replace.sub(bubble_usage, content, count=1)

# 11. Replace input bar
input_bar_target = re.compile(r'<div className="absolute bottom-0 left-0 w-full px-3 pt-2 safe-bottom z-20 pointer-events-none">[\s\S]*?</div>\n    </div>', re.MULTILINE)

input_bar_usage = """<MessageInputBar
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSend={handleSend}
        onTyping={handleTyping}
        onFileUpload={handleFileUpload}
      />
    </div>"""

content = input_bar_target.sub(input_bar_usage, content, count=1)

with open('frontend/src/components/ChatRoom.tsx', 'w') as f:
    f.write(content)

