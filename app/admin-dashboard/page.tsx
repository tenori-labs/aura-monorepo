import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { CategoryManager } from "@/components/category-manager";
import { getUserRole } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { PageFooter } from "@/components/page-footer";

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
    if (role !== "admin") {
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
            <PageHeader
                title="Admin Dashboard"
                subtitle={`Welcome, ${user.user_metadata?.full_name ?? user.email?.split("@")[0]}!`}
                userRole={role}
            />

            {/* Main Content */}
            <Flex
                direction="column"
                gap="5"
                px={{ initial: "4", sm: "6" }}
                py="5"
                style={{
                    flex: 1,
                    overflow: "auto",
                    maxWidth: "1000px",
                    width: "100%",
                    margin: "0 auto",
                }}
            >
                {/* Category Assignment Section */}
                <Flex direction="column" gap="3">
                    <Flex direction="column" gap="1">
                        <Heading size={{ initial: "3", sm: "4" }}>Category Assignments</Heading>
                        <Text size="2" color="gray">
                            Assign faculty members to incident categories. Reports will be auto-assigned to the designated faculty.
                        </Text>
                    </Flex>
                    <CategoryManager />
                </Flex>
            </Flex>

            {/* Responsive Styles */}
            <style>{`
                @media (max-width: 640px) {
                    .hide-on-mobile { display: none !important; }
                }
                @media (min-width: 641px) {
                    .hide-on-desktop { display: none !important; }
                }
            `}</style>
            <PageFooter />
        </div>
    );
}
