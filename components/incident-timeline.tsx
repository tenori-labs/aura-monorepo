"use client";

import { Flex, Text, Box } from "@radix-ui/themes";
import {
    FileTextIcon,
    MagnifyingGlassIcon,
    CheckCircledIcon,
} from "@radix-ui/react-icons";

/**
 * The 3 stages of an incident report lifecycle.
 */
const STAGES = [
    { key: "pending", label: "Submitted", icon: FileTextIcon },
    { key: "reviewing", label: "In Review", icon: MagnifyingGlassIcon },
    { key: "closed", label: "Closed", icon: CheckCircledIcon },
] as const;

function getStageIndex(status: string): number {
    const idx = STAGES.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : 0;
}

interface Props {
    status: string;
    assignedTo?: string | null;
}

export function IncidentTimeline({ status, assignedTo }: Props) {
    const currentIndex = getStageIndex(status);

    return (
        <Flex direction="column" gap="0" py="2">
            {STAGES.map((stage, i) => {
                const isCompleted = i < currentIndex;
                const isCurrent = i === currentIndex;
                const isActive = i <= currentIndex;
                const isLast = i === STAGES.length - 1;
                const Icon = stage.icon;

                return (
                    <Flex key={stage.key} direction="column" gap="0" align="start">
                        <Flex align="center" gap="3">
                            {/* Icon circle */}
                            <Box
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    background: isActive
                                        ? "var(--accent-9)"
                                        : "var(--gray-a4)",
                                    color: isActive
                                        ? "white"
                                        : "var(--gray-9)",
                                    boxShadow: isCurrent
                                        ? "0 0 0 4px var(--accent-a3)"
                                        : "none",
                                    transition: "all 0.3s ease",
                                    position: "relative",
                                    zIndex: 1,
                                }}
                            >
                                <Icon width="18" height="18" />
                            </Box>

                            {/* Label + subtitle */}
                            <Flex direction="column" gap="0">
                                <Text
                                    size="2"
                                    weight={isCurrent ? "bold" : "medium"}
                                    color={isActive ? undefined : "gray"}
                                >
                                    {stage.label}
                                </Text>
                                {/* Show assigned faculty info on the "In Review" stage */}
                                {stage.key === "reviewing" && isActive && assignedTo && (
                                    <Text size="1" color="gray">
                                        {assignedTo}
                                    </Text>
                                )}
                                {isCompleted && (
                                    <Text size="1" color="green">
                                        Done
                                    </Text>
                                )}
                                {isCurrent && !isCompleted && (
                                    <Text size="1" color="blue">
                                        Current
                                    </Text>
                                )}
                            </Flex>
                        </Flex>

                        {/* Connecting line */}
                        {!isLast && (
                            <Box
                                style={{
                                    width: 2,
                                    height: 24,
                                    marginLeft: 17,
                                    background: i < currentIndex
                                        ? "var(--accent-9)"
                                        : "var(--gray-a4)",
                                    transition: "background 0.3s ease",
                                }}
                            />
                        )}
                    </Flex>
                );
            })}
        </Flex>
    );
}
