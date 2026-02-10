import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { AuraChat } from "@/components/aura-chat";

export default async function WellBeingPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const email = user.email ?? "No email";
    const name =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        email.split("@")[0];

    return (
        <div
            className="font-sans"
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                background: "var(--gray-a2)",
            }}
        >
            {/* Header */}
            <Flex
                align="center"
                justify="between"
                wrap="wrap"
                gap="3"
                px={{ initial: "4", sm: "6" }}
                py="3"
                style={{
                    borderBottom: "1px solid var(--gray-a5)",
                    background: "var(--color-background)",
                    flexShrink: 0,
                }}
            >
                <Flex direction="column" gap="1">
                    <Heading size={{ initial: "4", sm: "5" }}>Well-Being</Heading>
                    <Text size="2" color="gray">
                        Talk to Aura, your AI mental health companion
                    </Text>
                </Flex>
                <Flex align="center" gap="3">
                    <HamburgerMenu />
                </Flex>
            </Flex>

            {/* Chat Area */}
            <Flex
                direction="column"
                px={{ initial: "3", sm: "6" }}
                py="4"
                style={{
                    flex: 1,
                    maxWidth: "800px",
                    width: "100%",
                    margin: "0 auto",
                }}
            >
                <AuraChat userName={name} userId={user.id} />
            </Flex>

            {/* Spin animation for loading indicator */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
