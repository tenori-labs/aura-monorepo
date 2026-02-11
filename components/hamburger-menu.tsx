"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Flex, Text, Separator, Button } from "@radix-ui/themes";
import { ThemeToggle } from "@/components/theme-toggle";
import { signout } from "@/app/auth/actions";

const navItems = [
    { label: "Incident Reporting", href: "/report-incident" },
    { label: "Well-Being", href: "/well-being" },
    { label: "Student Dashboard", href: "/dashboard" },
    { label: "Admin Dashboard", href: "/admin-dashboard" },
    { label: "Faculty Dashboard", href: "/faculty-dashboard" },
    { label: "Consent Form", href: "/consent-form" },
];

export function HamburgerMenu() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    return (
        <Box>
            {/* Hamburger Button */}
            <button
                onClick={() => setOpen(true)}
                aria-label="Open navigation menu"
                style={{
                    background: "none",
                    border: "1px solid var(--gray-a6)",
                    borderRadius: "var(--radius-2)",
                    padding: "6px 8px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    transition: "background 0.15s",
                }}
            >
                <span
                    style={{
                        display: "block",
                        width: "18px",
                        height: "2px",
                        background: "var(--gray-12)",
                        borderRadius: "1px",
                    }}
                />
                <span
                    style={{
                        display: "block",
                        width: "18px",
                        height: "2px",
                        background: "var(--gray-12)",
                        borderRadius: "1px",
                    }}
                />
                <span
                    style={{
                        display: "block",
                        width: "18px",
                        height: "2px",
                        background: "var(--gray-12)",
                        borderRadius: "1px",
                    }}
                />
            </button>

            {/* Slide-out Drawer & Backdrop */}
            {open && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
                    {/* Backdrop */}
                    <div
                        onClick={() => setOpen(false)}
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(0,0,0,0.4)",
                            backdropFilter: "blur(2px)",
                            animation: "fadeIn 0.2s ease-out",
                        }}
                    />

                    {/* Drawer Panel */}
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: "280px",
                            maxWidth: "80%",
                            background: "var(--color-background)",
                            borderLeft: "1px solid var(--gray-a5)",
                            boxShadow: "-5px 0 25px rgba(0,0,0,0.15)",
                            display: "flex",
                            flexDirection: "column",
                            animation: "slideIn 0.2s ease-out",
                        }}
                    >
                        {/* Drawer Header: Close Button + Theme/SignOut */}
                        <Flex direction="column" gap="4" p="4" style={{ borderBottom: "1px solid var(--gray-a4)" }}>
                            <Flex justify="between" align="center">
                                <Text weight="bold" size="3">Menu</Text>
                                <button
                                    onClick={() => setOpen(false)}
                                    aria-label="Close menu"
                                    style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: "8px",
                                        borderRadius: "var(--radius-2)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--gray-a3)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                                >
                                    <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.5571 3.21846 11.7816C3.44301 12.0062 3.80708 12.0062 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0062 11.5571 12.0062 11.7816 11.7816C12.0062 11.5571 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                    </svg>
                                </button>
                            </Flex>

                            <Flex justify="between" align="center">
                                <Flex align="center" gap="2">
                                    <Text size="2">Theme:</Text>
                                    <ThemeToggle />
                                </Flex>
                                <Button
                                    onClick={() => signout()}
                                    variant="soft"
                                    color="red"
                                    size="2"
                                >
                                    Sign out
                                </Button>
                            </Flex>
                        </Flex>

                        {/* Navigation Links */}
                        <Flex direction="column" p="2">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        style={{
                                            display: "block",
                                            padding: "12px 16px",
                                            textDecoration: "none",
                                            color: isActive ? "var(--accent-11)" : "var(--gray-12)",
                                            background: isActive ? "var(--accent-a3)" : "transparent",
                                            borderRadius: "var(--radius-2)",
                                            fontWeight: isActive ? 600 : 400,
                                            fontSize: "15px",
                                            marginBottom: "2px",
                                            transition: "background 0.1s",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) e.currentTarget.style.background = "var(--gray-a3)";
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) e.currentTarget.style.background = "transparent";
                                        }}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </Flex>
                    </div>
                </div>
            )}

            {/* Animation definitions */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </Box>
    );
}
