import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Container, Heading, Text, Flex } from "@radix-ui/themes";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { getUserRole } from "@/lib/roles";

export default async function AdminDashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Second layer of defense (middleware is first)
    if (!user) {
        redirect("/");
    }

    const role = getUserRole(user);
    if (role !== "faculty") {
        redirect("/dashboard");
    }

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
                    <Heading size={{ initial: "4", sm: "5" }}>Admin Dashboard</Heading>
                    <Text size="2" color="gray">
                        Welcome, {user.user_metadata?.full_name ?? user.email?.split("@")[0]}!
                    </Text>
                </Flex>
                <Flex align="center" gap="3">
                    <HamburgerMenu userRole={role} />
                </Flex>
            </Flex>

            {/* Main Content */}
            <Container p="6" style={{ flex: 1 }}>
                <Heading size="4" mb="4">Administrative Controls</Heading>
                <Text as="p" size="3" color="gray">
                    Administrative controls, system overview, and management tools will go here.
                </Text>
            </Container>
        </div>
    );
}
