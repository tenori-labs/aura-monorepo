import { Flex, Text, Separator } from "@radix-ui/themes";
import Link from "next/link";

export function PageFooter() {

    return (
        <footer
            style={{
                borderTop: "1px solid var(--gray-a5)",
                background: "var(--color-background)",
                flexShrink: 0,
            }}
        >
            <Flex
                direction={{ initial: "column", sm: "row" }}
                align="center"
                justify="between"
                gap="3"
                py="4"
                style={{
                    maxWidth: "900px",
                    width: "100%",
                    margin: "0 auto",
                    padding: "var(--space-4)",
                }}
            >
                {/* Left: Brand */}
                <Flex align="center" gap="2">
                    <Text
                        size="2"
                        weight="bold"
                        style={{ color: "var(--accent-9)", letterSpacing: "-0.02em" }}
                    >
                        Aura
                    </Text>
                    <Separator orientation="vertical" size="1" />
                    <Text size="1" color="gray">
                        Campus Safety & Well-Being Platform
                    </Text>
                </Flex>

                {/* Right: Links + Copyright */}
                <Flex align="center" gap="4">
                    <Link href="/dashboard" style={{ textDecoration: "none" }}>
                        <Text size="1" color="gray" style={{ cursor: "pointer" }}>
                            Dashboard
                        </Text>
                    </Link>
                    <Link href="/report-incident" style={{ textDecoration: "none" }}>
                        <Text size="1" color="gray" style={{ cursor: "pointer" }}>
                            Report
                        </Text>
                    </Link>
                    <Link href="/well-being" style={{ textDecoration: "none" }}>
                        <Text size="1" color="gray" style={{ cursor: "pointer" }}>
                            Well-Being
                        </Text>
                    </Link>
                </Flex>
            </Flex>
        </footer>
    );
}
