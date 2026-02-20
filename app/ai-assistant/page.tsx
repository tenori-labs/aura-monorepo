import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Flex } from "@radix-ui/themes";
import { PageHeader } from "@/components/page-header";
import { PageFooter } from "@/components/page-footer";
import { AuraChat } from "@/components/aura-chat";

export default async function AIAssistantPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/");
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
            <PageHeader
                title="AI Assistant"
                subtitle="Talk to Aura, your AI mental health companion"
            />

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
            <PageFooter />
        </div>
    );
}
