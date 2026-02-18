import { Flex, Heading, Separator, Text } from "@radix-ui/themes";
import Link from "next/link";
import { HamburgerMenu } from "@/components/hamburger-menu";
import type { UserRole } from "@/lib/roles";

interface PageHeaderProps {
    /** The page title shown after the Aura logo (e.g. "Report Incident") */
    title: string;
    /** Optional subtitle shown below the title on mobile, or beside on desktop */
    subtitle?: string;
    /** User role passed to HamburgerMenu for conditional nav links */
    userRole?: UserRole;
}

export function PageHeader({ title, subtitle, userRole }: PageHeaderProps) {
    return (
        <Flex
            align="center"
            justify="between"
            py="3"
            style={{
                borderBottom: "1px solid var(--gray-a5)",
                background: "var(--color-background)",
                flexShrink: 0,
            }}
        >
            {/* Inner container — matches page content width */}
            <Flex
                align="center"
                justify="between"
                style={{
                    maxWidth: "900px",
                    width: "100%",
                    margin: "0 auto",
                    padding: "0 var(--space-4)",
                }}
            >
                {/* Left: Logo + Title */}
                <Flex align="center" gap="3">
                    <Link href="/dashboard" style={{ textDecoration: "none" }}>
                        <Heading
                            size="5"
                            style={{
                                color: "var(--accent-9)",
                                fontWeight: 800,
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Aura
                        </Heading>
                    </Link>
                    <Separator orientation="vertical" size="2" />
                    <Flex direction="column" gap="0">
                        <Text weight="medium" size="3">{title}</Text>
                        {subtitle && (
                            <Text size="1" color="gray" className="hide-on-mobile">
                                {subtitle}
                            </Text>
                        )}
                    </Flex>
                </Flex>

                {/* Right: Hamburger Menu */}
                <Flex align="center" gap="3">
                    <HamburgerMenu userRole={userRole} />
                </Flex>
            </Flex>
        </Flex>
    );
}
