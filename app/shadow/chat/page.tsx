import { redirect } from 'next/navigation';
import { Flex, Text } from '@radix-ui/themes';
import { PageHeader } from '@/components/page-header';
import { PageFooter } from '@/components/page-footer';
import { getCurrentUser } from '@/lib/auth/server';
import { getActiveSession } from './chat-actions';
import { InterrogationChat } from '@/components/interrogation-chat';

/**
 * Reporter-facing interrogation chat page.
 *
 * Displays the active interrogation session for the current user.
 * If no active session exists, shows an informational message.
 * The chat is isolated — reporters cannot see other sessions.
 */
export default async function InterrogationChatPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect('/');
    }

    const userRole = user.role;
    const result = await getActiveSession();

    if ('error' in result) {
        redirect('/dashboard');
    }

    const session = result.session;

    return (
        <div
            className="font-sans"
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--gray-a2)',
            }}
        >
            <PageHeader
                title="Confidential Interview"
                subtitle="Your responses are private and isolated"
                userRole={userRole}
            />

            <Flex
                direction="column"
                gap="5"
                px={{ initial: '4', sm: '6' }}
                py="5"
                style={{
                    flex: 1,
                    overflow: 'auto',
                    maxWidth: '700px',
                    width: '100%',
                    margin: '0 auto',
                }}
            >
                {session ? (
                    <InterrogationChat
                        sessionId={session.id}
                        initialHistory={session.chatHistory}
                    />
                ) : (
                    <Flex direction="column" align="center" gap="3" py="9">
                        <Text size="3" color="gray" weight="medium">
                            No pending interviews
                        </Text>
                        <Text size="2" color="gray">
                            You have no active interview sessions at this time.
                        </Text>
                    </Flex>
                )}
            </Flex>

            <PageFooter />
        </div>
    );
}
