"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Badge,
    Box,
    Card,
    Dialog,
    Flex,
    Heading,
    Separator,
    Table,
    Text,
    Button,
    TextArea,
} from "@radix-ui/themes";
import {
    EyeOpenIcon,
    Share1Icon,
    CheckCircledIcon,
} from "@radix-ui/react-icons";
import { revealIdentity, updateReportStatus, generateCounselorReport } from "@/app/wellbeing/wellbeing-actions";

// Type matching the Prisma WellbeingReport model (plus accessCount)
interface WellbeingReport {
    id: string;
    caseId: string;
    uid: string;
    studentName?: string;
    generatedAt: Date;
    reportText: string;
    themes: string[];
    status: string;
    accessCount: number;
    // ─── Structured fields ───
    riskLevel?: string;
    summary?: string;
    observedBehaviors?: string[];
    recommendedActions?: string[];
    contextNotes?: string;
}

interface Props {
    reports: WellbeingReport[];
}

const getStatusColor = (status: string) => {
    switch (status) {
        case "pending": return "orange" as const;
        case "reviewed": return "blue" as const;
        case "passed_on": return "purple" as const;
        case "closed": return "green" as const;
        default: return "gray" as const;
    }
};

const getRiskColor = (risk?: string) => {
    switch (risk) {
        case "low": return "green" as const;
        case "moderate": return "orange" as const;
        case "high": return "red" as const;
        default: return "gray" as const;
    }
};

const getRiskIcon = (risk?: string) => {
    switch (risk) {
        case "low": return "●";
        case "moderate": return "▲";
        case "high": return "⬤";
        default: return "○";
    }
};

const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

export function WellbeingReportTable({ reports }: Props) {
    const router = useRouter();
    const [selected, setSelected] = useState<WellbeingReport | null>(null);
    const [revealReason, setRevealReason] = useState("");
    const [isRevealing, setIsRevealing] = useState(false);
    const [revealedName, setRevealedName] = useState<string | null>(null);
    const [counselorSnapshot, setCounselorSnapshot] = useState<string | null>(null);

    const onSelect = (report: WellbeingReport) => {
        setSelected(report);
        setRevealReason("");
        setRevealedName(null);
        setCounselorSnapshot(null);
        setIsRevealing(false);
    };

    const handleRevealIdentity = async () => {
        if (!selected) return;
        setIsRevealing(true);
        try {
            const result = await revealIdentity(selected.id, revealReason);
            if (result && result.studentName) {
                setRevealedName(result.studentName);
            }
        } catch (error) {
            console.error("Failed to reveal identity:", error);
            alert("Failed to reveal identity. Please try again.");
        } finally {
            setIsRevealing(false);
        }
    };

    const handleGenerateSnapshot = async () => {
        if (!selected) return;
        try {
            const snapshot = await generateCounselorReport(selected.id);
            setCounselorSnapshot(snapshot);
        } catch (error) {
            console.error("Failed to generate snapshot:", error);
            alert("Failed to generate counselor report.");
        }
    };

    const handleMarkReviewed = async () => {
        if (!selected) return;
        try {
            await updateReportStatus(selected.id, "reviewed");
            setSelected({ ...selected, status: "reviewed" });
            router.refresh();
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    const copyToClipboard = () => {
        if (counselorSnapshot) {
            navigator.clipboard.writeText(counselorSnapshot);
            alert("Report copied to clipboard!");
        }
    };

    // Check if a report has structured data
    const hasStructuredData = (r: WellbeingReport) => !!r.summary || !!r.riskLevel;

    return (
        <>
            <Card size="2" style={{ overflow: "hidden" }} className="hide-on-mobile">
                <Box style={{ overflowX: "auto" }}>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Case ID</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Risk</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Themes</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Identity Access</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {reports.map((report) => (
                                <Table.Row
                                    key={report.id}
                                    onClick={() => onSelect(report)}
                                    style={{ cursor: "pointer", transition: "background 0.1s" }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--gray-a3)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                    <Table.Cell>
                                        <Text size="2" weight="medium" style={{ fontFamily: "monospace" }}>
                                            {report.caseId}
                                        </Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Text size="2">{formatDate(report.generatedAt)}</Text>
                                    </Table.Cell>
                                    <Table.Cell>
                                        {report.riskLevel ? (
                                            <Badge color={getRiskColor(report.riskLevel)} size="1" variant="solid" style={{ textTransform: "capitalize" }}>
                                                {getRiskIcon(report.riskLevel)} {report.riskLevel}
                                            </Badge>
                                        ) : (
                                            <Text size="1" color="gray">—</Text>
                                        )}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Flex gap="1" wrap="wrap">
                                            {report.themes.slice(0, 2).map(t => (
                                                <Badge key={t} variant="soft" color="gray" size="1">{t}</Badge>
                                            ))}
                                            {report.themes.length > 2 && (
                                                <Badge variant="soft" color="gray" size="1">+{report.themes.length - 2}</Badge>
                                            )}
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge
                                            color={getStatusColor(report.status)}
                                            size="1"
                                            variant="soft"
                                            style={{ textTransform: "capitalize" }}
                                        >
                                            {report.status}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                        {report.accessCount > 0 ? (
                                            <Badge color="amber" variant="solid" size="1">Accessed ({report.accessCount})</Badge>
                                        ) : (
                                            <Text size="1" color="gray">Private</Text>
                                        )}
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Box>
            </Card>

            {/* ─── Reports Cards (mobile) ─── */}
            <Flex direction="column" gap="3" className="hide-on-desktop">
                {reports.map((report) => (
                    <Card
                        key={report.id}
                        size="2"
                        onClick={() => onSelect(report)}
                        style={{ cursor: "pointer", transition: "background 0.1s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--gray-a2)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = ""}
                    >
                        <Flex justify="between" align="start" gap="2" mb="2">
                            <Flex direction="column" gap="1" style={{ flex: 1 }}>
                                <Text size="1" color="gray" style={{ fontFamily: "monospace" }}>
                                    {report.caseId}
                                </Text>
                                {report.summary ? (
                                    <Text size="2" weight="bold" style={{ lineHeight: 1.4 }}>
                                        {report.summary.length > 60 ? report.summary.slice(0, 60) + "…" : report.summary}
                                    </Text>
                                ) : (
                                    <Text size="2" weight="bold">Wellbeing Alert</Text>
                                )}
                            </Flex>
                            <Badge
                                color={getStatusColor(report.status)}
                                size="1"
                                variant="soft"
                                style={{ textTransform: "capitalize", flexShrink: 0 }}
                            >
                                {report.status}
                            </Badge>
                        </Flex>

                        <Separator size="4" mb="2" />

                        <Flex direction="column" gap="1">
                            <Flex justify="between" gap="1">
                                <Text size="1" color="gray">Date</Text>
                                <Text size="1" weight="medium">{formatDate(report.generatedAt)}</Text>
                            </Flex>
                            <Flex justify="between" gap="1">
                                <Text size="1" color="gray">Risk Level</Text>
                                {report.riskLevel ? (
                                    <Badge color={getRiskColor(report.riskLevel)} size="1" variant="solid" style={{ textTransform: "capitalize" }}>
                                        {getRiskIcon(report.riskLevel)} {report.riskLevel}
                                    </Badge>
                                ) : (
                                    <Text size="1" color="gray">—</Text>
                                )}
                            </Flex>
                            <Flex justify="between" gap="1" align="center">
                                <Text size="1" color="gray">Themes</Text>
                                <Flex gap="1" wrap="wrap" justify="end" style={{ maxWidth: "65%" }}>
                                    {report.themes.slice(0, 2).map(t => (
                                        <Badge key={t} variant="soft" color="gray" size="1">{t}</Badge>
                                    ))}
                                    {report.themes.length > 2 && (
                                        <Badge variant="soft" color="gray" size="1">+{report.themes.length - 2}</Badge>
                                    )}
                                </Flex>
                            </Flex>
                        </Flex>

                        <Text size="1" color="blue" mt="2" style={{ display: "block", textAlign: "right" }}>
                            Tap to view details →
                        </Text>
                    </Card>
                ))}
            </Flex>

            {/* ─── Detail Dialog ─── */}
            <Dialog.Root open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
                <Dialog.Content style={{ maxWidth: 620, width: "calc(100vw - 32px)", maxHeight: "85vh", display: "flex", flexDirection: "column", padding: 0 }}>
                    {selected && (
                        <>
                            {/* ─── Header ─── */}
                            <Box px={{ initial: "3", sm: "5" }} pt={{ initial: "3", sm: "5" }} pb="3" style={{ borderBottom: "1px solid var(--gray-a4)", flexShrink: 0 }}>
                                <Dialog.Title mb="1">
                                    <Text size={{ initial: "3", sm: "5" }}>Wellbeing Report: <Text style={{ fontFamily: "monospace" }}>{selected.caseId}</Text></Text>
                                </Dialog.Title>
                                <Flex justify="between" align="center" mt="2" wrap="wrap" gap="2">
                                    <Flex gap="2" align="center">
                                        <Badge color={getStatusColor(selected.status)} size="2" variant="soft" style={{ textTransform: "capitalize" }}>
                                            {selected.status}
                                        </Badge>
                                        {selected.riskLevel && (
                                            <Badge color={getRiskColor(selected.riskLevel)} size="2" variant="solid" style={{ textTransform: "capitalize" }}>
                                                {getRiskIcon(selected.riskLevel)} {selected.riskLevel} Risk
                                            </Badge>
                                        )}
                                    </Flex>
                                    <Text size="2" color="gray">{formatDate(selected.generatedAt)}</Text>
                                </Flex>
                            </Box>

                            {/* ─── Scrollable Body ─── */}
                            <Box px={{ initial: "3", sm: "5" }} pb="4" style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>

                                {/* ─── Summary ─── */}
                                {selected.summary && (
                                    <Card
                                        size="2"
                                        mb="4"
                                        style={{
                                            background: selected.riskLevel === "high"
                                                ? "var(--red-a2)"
                                                : selected.riskLevel === "moderate"
                                                    ? "var(--orange-a2)"
                                                    : "var(--green-a2)",
                                            border: `1px solid ${selected.riskLevel === "high"
                                                ? "var(--red-a4)"
                                                : selected.riskLevel === "moderate"
                                                    ? "var(--orange-a4)"
                                                    : "var(--green-a4)"
                                                }`,
                                        }}
                                    >
                                        <Text size="2" style={{ lineHeight: 1.6 }}>
                                            {selected.summary}
                                        </Text>
                                    </Card>
                                )}

                                {/* ─── Observed Behaviors ─── */}
                                {selected.observedBehaviors && selected.observedBehaviors.length > 0 && (
                                    <Box mb="4">
                                        <Text size="2" weight="bold" mb="2" style={{ display: "block" }}>
                                            Observed Behaviors
                                        </Text>
                                        <Card variant="surface" size="1">
                                            <Flex direction="column" gap="2" py="1">
                                                {selected.observedBehaviors.map((b, i) => (
                                                    <Flex key={i} gap="2" align="start">
                                                        <Text size="2" color="gray" style={{ flexShrink: 0, marginTop: 2 }}>•</Text>
                                                        <Text size="2" style={{ lineHeight: 1.5 }}>{b}</Text>
                                                    </Flex>
                                                ))}
                                            </Flex>
                                        </Card>
                                    </Box>
                                )}

                                {/* ─── Recommended Actions ─── */}
                                {selected.recommendedActions && selected.recommendedActions.length > 0 && (
                                    <Box mb="4">
                                        <Text size="2" weight="bold" mb="2" style={{ display: "block" }}>
                                            Recommended Actions
                                        </Text>
                                        <Flex direction="column" gap="2">
                                            {selected.recommendedActions.map((a, i) => (
                                                <Card key={i} variant="surface" size="1">
                                                    <Flex gap="2" align="start">
                                                        <Badge color="blue" variant="solid" size="1" style={{ flexShrink: 0, marginTop: 2 }}>
                                                            {i + 1}
                                                        </Badge>
                                                        <Text size="2" style={{ lineHeight: 1.5 }}>{a}</Text>
                                                    </Flex>
                                                </Card>
                                            ))}
                                        </Flex>
                                    </Box>
                                )}

                                {/* ─── Context Notes ─── */}
                                {selected.contextNotes && (
                                    <Box mb="4">
                                        <Text size="2" weight="bold" mb="2" style={{ display: "block" }}>
                                            Context Notes
                                        </Text>
                                        <Box p="3" style={{ background: "var(--gray-a2)", borderRadius: "var(--radius-3)" }}>
                                            <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
                                                {selected.contextNotes}
                                            </Text>
                                        </Box>
                                    </Box>
                                )}

                                {/* ─── Themes ─── */}
                                <Box mb="4">
                                    <Text size="2" weight="bold" mb="2" style={{ display: "block" }}>Themes</Text>
                                    <Flex gap="2" wrap="wrap">
                                        {selected.themes.map(t => (
                                            <Badge key={t} size="2" variant="surface" color="gray">{t}</Badge>
                                        ))}
                                    </Flex>
                                </Box>

                                {/* ─── Legacy Report Text (fallback for old reports) ─── */}
                                {!hasStructuredData(selected) && (
                                    <Box mb="4" p="3" style={{ background: "var(--gray-a3)", borderRadius: "var(--radius-3)" }}>
                                        <Text size="2" style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                            {selected.reportText}
                                        </Text>
                                    </Box>
                                )}

                                <Separator size="4" my="4" />

                                {/* ─── Identity Section ─── */}
                                <Box mb="4">
                                    <Heading size="3" mb="2">Student Identity</Heading>
                                    {revealedName ? (
                                        <Card size="2" variant="classic" style={{ background: "var(--amber-3)" }}>
                                            <Text size="3" weight="bold" color="amber">
                                                Student: {revealedName}
                                            </Text>
                                            <Text size="2" color="gray" style={{ display: "block", marginTop: 4 }}>
                                                UID: {selected.uid}
                                            </Text>
                                        </Card>
                                    ) : (
                                        <Card size="2">
                                            <Flex direction="column" gap="3">
                                                <Flex align="center" gap="2">
                                                    <EyeOpenIcon />
                                                    <Text size="2" weight="bold">Restricted Access</Text>
                                                </Flex>
                                                <Text size="2" color="gray">
                                                    Viewing the student&apos;s identity will be logged for audit purposes.
                                                </Text>
                                                <TextArea
                                                    placeholder="Reason for accessing identity (min 5 chars)..."
                                                    value={revealReason}
                                                    onChange={e => setRevealReason(e.target.value)}
                                                />
                                                <Button
                                                    onClick={handleRevealIdentity}
                                                    disabled={revealReason.length < 5 || isRevealing}
                                                    color="amber"
                                                    variant="soft"
                                                >
                                                    {isRevealing ? "Logging Access..." : "Reveal Identity"}
                                                </Button>
                                            </Flex>
                                        </Card>
                                    )}
                                </Box>

                                {/* ─── Counselor Snapshot Section ─── */}
                                {counselorSnapshot && selected && (
                                    <Box mb="4">
                                        <Heading size="3" mb="2">Counselor Handover</Heading>
                                        <Card
                                            size="2"
                                            style={{
                                                background: "var(--gray-a2)",
                                                border: "1px solid var(--gray-a4)",
                                            }}
                                        >
                                            <Flex direction="column" gap="3">
                                                {/* Header */}
                                                <Flex justify="between" align="center" wrap="wrap" gap="2">
                                                    <Text size="1" weight="bold" color="gray" style={{ letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                                        Safeguarding Report
                                                    </Text>
                                                    {selected.riskLevel && (
                                                        <Badge color={getRiskColor(selected.riskLevel)} size="1" variant="solid" style={{ textTransform: "capitalize" }}>
                                                            {selected.riskLevel} Risk
                                                        </Badge>
                                                    )}
                                                </Flex>

                                                <Flex gap="4" wrap="wrap">
                                                    <Text size="1" color="gray">Case: <Text weight="medium" style={{ fontFamily: "monospace" }}>{selected.caseId}</Text></Text>
                                                    <Text size="1" color="gray">Date: <Text weight="medium">{formatDate(selected.generatedAt)}</Text></Text>
                                                </Flex>

                                                <Separator size="4" />

                                                {/* Summary */}
                                                {selected.summary && (
                                                    <Box>
                                                        <Text size="1" weight="bold" color="gray" mb="1" style={{ display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Summary</Text>
                                                        <Text size="2" style={{ lineHeight: 1.6 }}>{selected.summary}</Text>
                                                    </Box>
                                                )}

                                                {/* Observed Behaviors */}
                                                {selected.observedBehaviors && selected.observedBehaviors.length > 0 && (
                                                    <Box>
                                                        <Text size="1" weight="bold" color="gray" mb="1" style={{ display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Observed Behaviors</Text>
                                                        <Flex direction="column" gap="1">
                                                            {selected.observedBehaviors.map((b, i) => (
                                                                <Text key={i} size="2" style={{ lineHeight: 1.5 }}>• {b}</Text>
                                                            ))}
                                                        </Flex>
                                                    </Box>
                                                )}

                                                {/* Themes */}
                                                {selected.themes.length > 0 && (
                                                    <Box>
                                                        <Text size="1" weight="bold" color="gray" mb="1" style={{ display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Themes</Text>
                                                        <Flex gap="2" wrap="wrap">
                                                            {selected.themes.map(t => (
                                                                <Badge key={t} size="1" variant="surface" color="gray">{t}</Badge>
                                                            ))}
                                                        </Flex>
                                                    </Box>
                                                )}

                                                {/* Recommended Actions */}
                                                {selected.recommendedActions && selected.recommendedActions.length > 0 && (
                                                    <Box>
                                                        <Text size="1" weight="bold" color="gray" mb="1" style={{ display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Recommended Actions</Text>
                                                        <Flex direction="column" gap="1">
                                                            {selected.recommendedActions.map((a, i) => (
                                                                <Text key={i} size="2" style={{ lineHeight: 1.5 }}>{i + 1}. {a}</Text>
                                                            ))}
                                                        </Flex>
                                                    </Box>
                                                )}

                                                {/* Context Notes */}
                                                {selected.contextNotes && (
                                                    <Box>
                                                        <Text size="1" weight="bold" color="gray" mb="1" style={{ display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Context</Text>
                                                        <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>{selected.contextNotes}</Text>
                                                    </Box>
                                                )}

                                                <Separator size="4" />

                                                {/* Footer note + Copy */}
                                                <Flex justify="between" align="center" wrap="wrap" gap="2">
                                                    <Text size="1" color="gray" style={{ fontStyle: "italic", maxWidth: 350 }}>
                                                        No diagnostic claims are made. Use this context to guide initial outreach.
                                                    </Text>
                                                    <Button size="1" onClick={copyToClipboard} variant="soft" color="gray">
                                                        Copy as Text
                                                    </Button>
                                                </Flex>
                                            </Flex>
                                        </Card>
                                    </Box>
                                )}
                            </Box>

                            {/* ─── Footer ─── */}
                            <Flex gap="2" justify="end" px={{ initial: "3", sm: "5" }} py="3" wrap="wrap" style={{ borderTop: "1px solid var(--gray-a4)", flexShrink: 0 }}>
                                <Dialog.Close>
                                    <Button variant="soft" color="gray">Close</Button>
                                </Dialog.Close>

                                {!counselorSnapshot && (
                                    <Button onClick={handleGenerateSnapshot} variant="surface" color="purple">
                                        <Share1Icon /> Pass to Counselor
                                    </Button>
                                )}

                                {selected.status === 'pending' && (
                                    <Button onClick={handleMarkReviewed} variant="solid" color="blue">
                                        <CheckCircledIcon /> Mark Reviewed
                                    </Button>
                                )}
                            </Flex>
                        </>
                    )}
                </Dialog.Content>
            </Dialog.Root>
        </>
    );
}
