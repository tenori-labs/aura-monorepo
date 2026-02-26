'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import {
    Box,
    Button,
    Card,
    Flex,
    Heading,
    ScrollArea,
    Text,
    TextField,
} from '@radix-ui/themes';
import { PaperPlaneIcon } from '@radix-ui/react-icons';

/**
 * Props for the InterrogationChat component.
 * @property sessionId - The InterrogationSession ID
 * @property initialHistory - Chat messages loaded from the server
 */
interface InterrogationChatProps {
    sessionId: string;
    initialHistory: { role: 'user' | 'model'; content: string }[];
}

/**
 * Reporter-facing interrogation chat component.
 *
 * Renders as an async chat interface where the AI interviewer extracts
 * structured anchor points (time, location, witnesses) through natural
 * conversation. Sessions are isolated per reporter.
 */
export function InterrogationChat({ sessionId, initialHistory }: InterrogationChatProps) {
    const [messages, setMessages] = useState(initialHistory);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const greetingSent = useRef(initialHistory.length > 0);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-send greeting on first load (ref guard survives Strict Mode double-fire)
    useEffect(() => {
        if (!greetingSent.current) {
            greetingSent.current = true;
            handleSendMessage('Hello');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSendMessage = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || loading) return;

        if (!text) setInput('');
        if (!text) {
            setMessages((prev) => [...prev, { role: 'user', content: messageText }]);
        }

        setLoading(true);
        try {
            const { sendInterrogationMessage } = await import(
                '@/app/shadow/chat/chat-actions'
            );
            const result = await sendInterrogationMessage(sessionId, messageText);

            if ('error' in result) {
                setMessages((prev) => [
                    ...prev,
                    { role: 'model', content: `Error: ${result.error}` },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    ...(text ? [{ role: 'user' as const, content: messageText }] : []),
                    { role: 'model', content: result.response },
                ]);
                if (result.isComplete) {
                    setIsComplete(true);
                }
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: 'model', content: 'Something went wrong. Please try again.' },
            ]);
        }
        setLoading(false);
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleSendMessage();
    };

    return (
        <Card size="2" style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <Flex direction="column" gap="2" style={{ flex: 1, minHeight: 0 }}>
                <Flex align="center" gap="2" pb="2" style={{ borderBottom: '1px solid var(--gray-a4)' }}>
                    <Heading size="3">Confidential Interview</Heading>
                    {isComplete && (
                        <Text size="1" color="green" weight="bold">
                            Session Complete
                        </Text>
                    )}
                </Flex>

                <ScrollArea style={{ flex: 1 }} ref={scrollRef}>
                    <Flex direction="column" gap="3" p="2">
                        {messages.map((msg, i) => (
                            <Flex
                                key={i}
                                justify={msg.role === 'user' ? 'end' : 'start'}
                            >
                                <Box
                                    p="3"
                                    style={{
                                        background:
                                            msg.role === 'user'
                                                ? 'var(--accent-a3)'
                                                : 'var(--gray-a3)',
                                        borderRadius: 'var(--radius-3)',
                                        maxWidth: '80%',
                                    }}
                                >
                                    <Text size="2">{msg.content}</Text>
                                </Box>
                            </Flex>
                        ))}
                        {loading && (
                            <Flex justify="start">
                                <Box
                                    p="3"
                                    style={{
                                        background: 'var(--gray-a3)',
                                        borderRadius: 'var(--radius-3)',
                                    }}
                                >
                                    <Text size="2" color="gray">
                                        Typing...
                                    </Text>
                                </Box>
                            </Flex>
                        )}
                    </Flex>
                </ScrollArea>

                {!isComplete ? (
                    <form onSubmit={handleSubmit}>
                        <Flex gap="2">
                            <Box style={{ flex: 1 }}>
                                <TextField.Root
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your response..."
                                    disabled={loading}
                                />
                            </Box>
                            <Button
                                type="submit"
                                disabled={loading || input.trim().length < 2}
                            >
                                <PaperPlaneIcon />
                            </Button>
                        </Flex>
                    </form>
                ) : (
                    <Card style={{ background: 'var(--green-a2)' }}>
                        <Text size="2" color="green" weight="bold">
                            Thank you. Your responses have been recorded confidentially.
                        </Text>
                    </Card>
                )}
            </Flex>
        </Card>
    );
}
