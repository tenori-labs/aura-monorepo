'use client';

import { useEffect, useState, useRef, type FormEvent } from 'react';
import {
  mentalHealthChat,
  type MentalHealthChatInput,
  type ChatMessage,
} from '@/lib/ai/flows/mental-health-chat-flow';
import { handleClarification, generateAndStoreReport } from '@/app/ai-assistant/actions';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
  ScrollArea,
} from '@radix-ui/themes';
import { PaperPlaneIcon, UpdateIcon, ChatBubbleIcon } from '@radix-ui/react-icons';

interface AuraChatProps {
  userName: string;
  userId: string;
}

/**
 * Local chat message — adds an optional `isReferral` flag for the green
 * counsellor-referral callout that fires after a confirmed self-harm signal.
 * Referral messages are visually distinct AND filtered out of the LLM
 * history pass so Aura doesn't try to "reply to" the referral on next turn.
 */
type LocalChatMessage = ChatMessage & { isReferral?: boolean };

export function AuraChat({ userName, userId }: AuraChatProps) {
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clarification state
  const [awaitingClarification, setAwaitingClarification] = useState(false);
  const [flaggedContext, setFlaggedContext] = useState<{
    themes: string[];
    originalMessage: string;
  } | null>(null);

  // After a confirmed crisis, prevent the LLM from re-asking the same check-in
  // question. The wellbeing report has already been logged silently for staff;
  // Aura continues with normal supportive conversation from here.
  const [postCrisis, setPostCrisis] = useState(false);

  // Hardcoded empathetic replies — used to break LLM loops in safety-adjacent
  // turns. Deliberately do NOT mention helplines, reports, or counsellors.
  const POST_CONFIRMATION_REPLY =
    "Thank you for telling me — that takes a lot. What you're carrying sounds really heavy, and I'm here with you. Would you like to share more about what's been weighing on you?";
  const POST_FALSE_POSITIVE_REPLY =
    "Thank you for clarifying. I just wanted to make sure you were okay. I'm here whenever you'd like to talk — what's been on your mind?";
  const POST_CRISIS_FALLBACK_REPLY =
    "I hear you. Whatever you're feeling right now is real, and I'm not going anywhere. Tell me more if you'd like — I'm listening.";

  // Counsellor referral — shown as a green callout right after a confirmed
  // crisis. Placeholder contact for now; swap in real counsellor data later.
  const COUNSELLOR_REFERRAL =
    "If you'd like to talk to someone in person, please reach out to our campus counsellor — Dr. Counsellor XYZ (counsellor@campus.edu, +91 XXXXX XXXXX). You don't have to go through this alone.";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initial greeting
  useEffect(() => {
    const getInitialGreeting = async () => {
      setIsLoading(true);
      try {
        const initialInput: MentalHealthChatInput = {
          studentId: userId,
          newMessage: { role: 'user', content: 'Hello Aura' },
          history: [],
          isGreeting: true,
          isClarificationResponse: false,
        };
        const response = await mentalHealthChat(initialInput);
        if (response.responseText) {
          setMessages([{ role: 'model', content: response.responseText }]);
        } else {
          setMessages([
            {
              role: 'model',
              content:
                "Hello! I'm Aura, your AI companion for mental well-being. How are you feeling today?",
            },
          ]);
        }
      } catch (error) {
        console.error('Error fetching initial greeting:', error);
        setMessages([
          {
            role: 'model',
            content:
              "I'm having a little trouble connecting right now. Please try refreshing the page.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    getInitialGreeting();
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessageContent = input.trim();
    const newUserMessage: ChatMessage = { role: 'user', content: userMessageContent };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Are we processing a clarification (user responding to "Are you okay?")
      const wasAwaitingClarification = awaitingClarification && flaggedContext;

      if (wasAwaitingClarification) {
        // 1. Run clarification assessment
        const clarificationResult = await handleClarification({
          originalMessage: flaggedContext.originalMessage,
          studentClarification: userMessageContent,
        });

        // 2. If confirmed crisis: silently log the wellbeing report for staff.
        //    Don't tell the student about the report.
        if (clarificationResult.isGenuineDistress) {
          await generateAndStoreReport({
            themes: flaggedContext.themes,
            clarificationSummary: clarificationResult.summary,
            studentName: userName,
            uid: userId,
          });
          setPostCrisis(true);
        }

        // 3. Exit clarification mode and reply with a hardcoded empathetic message.
        //    The LLM is bypassed this turn — it has a strong tendency to re-ask
        //    the same check-in question, which would loop the user.
        const reply = clarificationResult.isGenuineDistress
          ? POST_CONFIRMATION_REPLY
          : POST_FALSE_POSITIVE_REPLY;
        setMessages((prev) => {
          const next: LocalChatMessage[] = [...prev, { role: 'model', content: reply }];
          // After a confirmed crisis, append the counsellor referral callout.
          if (clarificationResult.isGenuineDistress) {
            next.push({
              role: 'model',
              content: COUNSELLOR_REFERRAL,
              isReferral: true,
            });
          }
          return next;
        });
        setAwaitingClarification(false);
        setFlaggedContext(null);
        setIsLoading(false);
        return;
      }

      // Correct logic for isClarificationResponse:
      // We want it true if we *were* awaiting clarification at the start of this submit.
      // Since we reset awaitingClarification above, we need to capture the fact.
      // Actually, we can just use the `if (awaitingClarification)` block to set a flag.

      // Strip referral messages from history before sending to the LLM —
      // they're a UI-only callout, not part of the conversation, and we
      // don't want Aura to react to its own referral text on the next turn.
      const llmHistory = messages
        .filter((m) => !m.isReferral)
        .map(({ role, content }) => ({ role, content }));

      const finalChatInput: MentalHealthChatInput = {
        studentId: userId,
        newMessage: newUserMessage,
        history: llmHistory,
        isGreeting: false,
        isClarificationResponse: Boolean(wasAwaitingClarification), // flaggedContext is not null if we were awaiting
      };

      const response = await mentalHealthChat(finalChatInput);

      // Defensive override: in post-crisis mode, never let the LLM steer the
      // conversation back to the check-in question. If it tries to flag again,
      // substitute a warm fallback. The wellbeing report is already on file.
      if (postCrisis && response.selfHarmSignal) {
        setMessages((prev) => [
          ...prev,
          { role: 'model', content: POST_CRISIS_FALLBACK_REPLY },
        ]);
        return;
      }

      if (response.responseText) {
        setMessages((prev) => [...prev, { role: 'model', content: response.responseText! }]);

        // Only flag a NEW clarification turn if we haven't already confirmed
        // a crisis this session. Post-crisis, further self-harm signals are
        // logged internally (see fallback above) but don't re-prompt the user.
        if (response.selfHarmSignal && !postCrisis) {
          setAwaitingClarification(true);
          setFlaggedContext({
            themes: response.conversationThemes || [],
            // Raw message stored in client state — clarifyDistress flow
            // will sanitize both originalMessage and studentClarification
            // server-side before sending to Gemini.
            originalMessage: userMessageContent,
          });
        }
      } else if (response.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'model', content: response.error || 'An error occurred.' },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: "I'm not sure how to respond to that. Could you try rephrasing?",
          },
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const initials = userName.charAt(0).toUpperCase();

  return (
    <Card
      size="3"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)',
        overflow: 'hidden',
      }}
    >
      {/* Chat Header */}
      <Flex
        align="center"
        justify="between"
        pb="3"
        style={{ borderBottom: '1px solid var(--gray-a5)' }}
      >
        <Flex align="center" gap="3">
          <Avatar
            size="3"
            fallback="A"
            radius="full"
            color="iris"
            style={{
              background: 'linear-gradient(135deg, var(--iris-9), var(--purple-9))',
            }}
          />
          <Flex direction="column">
            <Heading size="3">
              <ChatBubbleIcon
                style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}
              />
              Aura
            </Heading>
            <Text size="1" color="gray">
              Your safe space to talk, {userName}
            </Text>
          </Flex>
        </Flex>
        <Badge color="green" variant="soft" size="1">
          Online
        </Badge>
      </Flex>

      {/* Messages Area */}
      <ScrollArea
        style={{
          flex: 1,
          padding: '16px 0',
        }}
      >
        <Flex direction="column" gap="3" px="2">
          {messages.map((msg, index) => {
            // Special-case the counsellor-referral callout: rendered as a
            // green system-level card without Aura's avatar, so it reads
            // as a resource pointer rather than another chat reply.
            if (msg.isReferral) {
              return (
                <Box
                  key={index}
                  style={{
                    alignSelf: 'stretch',
                    background: 'var(--green-a3)',
                    border: '1px solid var(--green-a6)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <Text
                    size="1"
                    weight="bold"
                    color="green"
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Support Resource
                  </Text>
                  <Text size="2" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {msg.content}
                  </Text>
                </Box>
              );
            }

            return (
              <Flex
                key={index}
                justify={msg.role === 'user' ? 'end' : 'start'}
                align="end"
                gap="2"
              >
                {msg.role === 'model' && (
                  <Avatar
                    size="2"
                    fallback="A"
                    radius="full"
                    color="iris"
                    style={{
                      flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--iris-9), var(--purple-9))',
                    }}
                  />
                )}
                <Box
                  style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user' ? 'var(--accent-9)' : 'var(--gray-a3)',
                    color: msg.role === 'user' ? 'var(--accent-contrast)' : 'var(--gray-12)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                >
                  <Text size="2" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {msg.content}
                  </Text>
                </Box>
                {msg.role === 'user' && (
                  <Avatar
                    size="2"
                    fallback={initials}
                    radius="full"
                    color="blue"
                    style={{ flexShrink: 0 }}
                  />
                )}
              </Flex>
            );
          })}

          {/* Typing indicator */}
          {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
            <Flex justify="start" align="end" gap="2">
              <Avatar
                size="2"
                fallback="A"
                radius="full"
                color="iris"
                style={{
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--iris-9), var(--purple-9))',
                }}
              />
              <Box
                style={{
                  padding: '12px 18px',
                  borderRadius: '16px 16px 16px 4px',
                  background: 'var(--gray-a3)',
                }}
              >
                <UpdateIcon
                  style={{
                    animation: 'spin 1s linear infinite',
                    color: 'var(--accent-9)',
                  }}
                />
              </Box>
            </Flex>
          )}
          <div ref={messagesEndRef} />
        </Flex>
      </ScrollArea>

      {/* Input Area */}
      <Box pt="3" style={{ borderTop: '1px solid var(--gray-a5)' }}>
        <form onSubmit={handleSubmit}>
          <Flex gap="2" align="center">
            <Box style={{ flex: 1 }}>
              <TextField.Root
                ref={inputRef}
                size="3"
                placeholder="Type your message to Aura..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                autoComplete="off"
              />
            </Box>
            <Button
              type="submit"
              size="3"
              disabled={isLoading || !input.trim()}
              style={{ flexShrink: 0 }}
            >
              {isLoading ? (
                <UpdateIcon style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <PaperPlaneIcon />
              )}
            </Button>
          </Flex>
        </form>
        <Text size="1" color="gray" align="center" mt="2" style={{ display: 'block' }}>
          Aura is an AI companion, not a substitute for professional therapy. If you&apos;re in
          crisis, please contact a helpline.
        </Text>
      </Box>
    </Card>
  );
}
