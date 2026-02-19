"use client";

import { useState } from "react";
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
import { revealIdentity, updateReportStatus, generateCounselorReport } from "@/app/faculty-dashboard/wellbeing-actions";

// Type matching the Prisma WellbeingReport model (plus accessCount)
interface WellbeingReport {
    id: string;
    caseId: string;
    uid: string;
    studentName?: string; // Optional because it's stripped by default
    generatedAt: Date;
    reportText: string;
    themes: string[];
    status: string;
    accessCount: number;
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

const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

export function WellbeingReportTable({ reports }: Props) {
    const [selected, setSelected] = useState<WellbeingReport | null>(null);
    const [revealReason, setRevealReason] = useState("");
    const [isRevealing, setIsRevealing] = useState(false);
    const [revealedName, setRevealedName] = useState<string | null>(null);
    const [counselorSnapshot, setCounselorSnapshot] = useState<string | null>(null);

    // Reset internal state when selection changes
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
            alert("Status updated to Reviewed. Please refresh the page to see changes.");
            // In a real app we'd optimistic update or router.refresh()
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

    return (
        <>
            <Card size="2" style={{ overflow: "hidden" }}>
                <Box style={{ overflowX: "auto" }}>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Case ID</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
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

            {/* ─── Detail Dialog ─── */}
            <Dialog.Root open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
                <Dialog.Content style={{ maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
                    {selected && (
                        <>
                            <Dialog.Title mb="2">
                                Wellbeing Report: <Text style={{ fontFamily: "monospace" }}>{selected.caseId}</Text>
                            </Dialog.Title>

                            <Box style={{ flex: 1, overflowY: "auto", paddingRight: 10 }}>
                                <Flex justify="between" align="center" mb="4">
                                    <Badge color={getStatusColor(selected.status)} size="3" variant="soft">
                                        {selected.status}
                                    </Badge>
                                    <Text size="2" color="gray">{formatDate(selected.generatedAt)}</Text>
                                </Flex>

                                <Box mb="4">
                                    <Text size="2" weight="bold" mb="2" style={{ display: "block" }}>Observed Themes</Text>
                                    <Flex gap="2" wrap="wrap">
                                        {selected.themes.map(t => (
                                            <Badge key={t} size="2" variant="surface" color="gray">{t}</Badge>
                                        ))}
                                    </Flex>
                                </Box>

                                <Box mb="4" p="3" style={{ background: "var(--gray-a3)", borderRadius: "var(--radius-3)" }}>
                                    <Text size="2" style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                        {selected.reportText}
                                    </Text>
                                </Box>

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
                                {counselorSnapshot && (
                                    <Box mb="4">
                                        <Heading size="3" mb="2">Counselor Handover</Heading>
                                        <TextArea
                                            readOnly
                                            value={counselorSnapshot}
                                            style={{ height: 200, fontFamily: "monospace", fontSize: 13 }}
                                        />
                                        <Button mt="2" onClick={copyToClipboard} variant="outline">
                                            Copy to Clipboard
                                        </Button>
                                    </Box>
                                )}
                            </Box>

                            <Flex gap="3" justify="end" mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-a4)" }}>
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
