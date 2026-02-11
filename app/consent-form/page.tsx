import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Container, Flex, Heading, Text, Card, Badge, Button, Separator } from "@radix-ui/themes";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { getUserRole } from "@/lib/roles";
import { ConsentForm } from "@/components/consent-form";
import prisma from "@/lib/db";
import { CheckCircledIcon, DownloadIcon } from "@radix-ui/react-icons";
import Link from "next/link";

export default async function ConsentFormPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const role = getUserRole(user);

    // Get user details
    const fullName = user.user_metadata?.full_name ?? user.email?.split("@")[0];
    // In a real app, studentId/course would come from a profile table or SIS integration
    // For now we'll simulate or leave empty
    const studentId = user.user_metadata?.student_id || "";
    const course = user.user_metadata?.course || "";

    // Check if user has already signed
    const existingConsent = await prisma.consentRecord.findFirst({
        where: { userId: user.id },
        orderBy: { signedAt: "desc" } // Get latest
    });

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
                    <Heading size={{ initial: "4", sm: "5" }}>Consent Form</Heading>
                    <Text size="2" color="gray">
                        UGC Anti-Ragging Undertaking
                    </Text>
                </Flex>
                <Flex align="center" gap="3">
                    <HamburgerMenu userRole={role} />
                </Flex>
            </Flex>

            {/* Main Content */}
            <Container p="4" style={{ flex: 1, maxWidth: "900px" }}>
                {existingConsent ? (
                    // Receipt View
                    <Card size="4">
                        <Flex direction="column" align="center" gap="5" py="6">
                            <CheckCircledIcon width="64" height="64" color="green" />
                            <Heading size="6" align="center">Undertaking Submitted Successfully</Heading>

                            <Flex direction="column" gap="2" align="center">
                                <Text size="3" color="gray">
                                    Signed by <Text weight="bold" color="gray">{existingConsent.fullName}</Text>
                                </Text>
                                <Text size="2" color="gray">
                                    on {new Date(existingConsent.signedAt).toLocaleDateString("en-US", {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Text>
                            </Flex>

                            <Badge color="green" size="3" variant="soft">
                                Reference ID: {existingConsent.id.slice(-8).toUpperCase()}
                            </Badge>

                            <Separator size="4" my="2" />

                            <Flex gap="3" mt="2" direction={{ initial: "column", sm: "row" }} style={{ width: "100%" }}>
                                <Link href="/dashboard" style={{ width: "100%" }}>
                                    <Button variant="outline" size="3" style={{ width: "100%" }}>
                                        Return to Dashboard
                                    </Button>
                                </Link>
                                <Button size="3" disabled style={{ width: "100%" }}>
                                    <DownloadIcon /> Download Copy (Coming Soon)
                                </Button>
                            </Flex>
                        </Flex>
                    </Card>
                ) : (
                    // Form View
                    <ConsentForm
                        fullName={fullName}
                        studentId={studentId}
                        course={course}
                    />
                )}
            </Container>
        </div>
    );
}
