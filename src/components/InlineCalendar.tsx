import React, { useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface InlineCalendarProps {
    value?: Date; // Currently selected date
    onSelect: (date: Date) => void;
    disabledDates?: (date: Date) => boolean; // Function to check if date is disabled
    minDate?: Date;
    maxDate?: Date;
    title?: string;
}

export function InlineCalendar({
    value,
    onSelect,
    disabledDates,
    minDate,
    maxDate,
    title,
}: InlineCalendarProps) {
    const [month, setMonth] = React.useState<Date>(
        value ? new Date(value) : new Date(),
    );

    const isDisabled = (date: Date): boolean => {
        if (disabledDates && disabledDates(date)) return true;
        if (minDate && date < minDate) return true;
        if (maxDate && date > maxDate) return true;
        return false;
    };

    const daysInMonth = useMemo(() => {
        const year = month.getFullYear();
        const monthNum = month.getMonth();
        const firstDay = new Date(year, monthNum, 1);
        const lastDay = new Date(year, monthNum + 1, 0);
        const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday
        const daysCount = lastDay.getDate();

        const weeks: (Date | null)[][] = [];
        let currentWeek: (Date | null)[] = Array(firstDayOfWeek).fill(null);

        for (let day = 1; day <= daysCount; day++) {
            const date = new Date(year, monthNum, day);
            currentWeek.push(date);

            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }

        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) currentWeek.push(null);
            weeks.push(currentWeek);
        }

        return weeks;
    }, [month]);

    const handlePrevMonth = () => {
        setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    };

    const handleSelectDate = (date: Date) => {
        if (!isDisabled(date)) {
            onSelect(date);
        }
    };

    const monthName = new Intl.DateTimeFormat("vi-VN", {
        month: "long",
        year: "numeric",
    }).format(month);

    const isToday = (date: Date): boolean => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    const isSelected = (date: Date): boolean => {
        if (!value) return false;
        return (
            date.getDate() === value.getDate() &&
            date.getMonth() === value.getMonth() &&
            date.getFullYear() === value.getFullYear()
        );
    };

    return (
        <View style={styles.container}>
            {title && <Text style={styles.title}>{title}</Text>}

            {/* Month Navigation */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handlePrevMonth} activeOpacity={0.7}>
                    <MaterialCommunityIcons
                        name="chevron-left"
                        size={24}
                        color="#0891b2"
                    />
                </TouchableOpacity>
                <Text style={styles.monthText}>{monthName}</Text>
                <TouchableOpacity onPress={handleNextMonth} activeOpacity={0.7}>
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color="#0891b2"
                    />
                </TouchableOpacity>
            </View>

            {/* Weekday Labels */}
            <View style={styles.weekdayRow}>
                {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day, idx) => (
                    <Text key={idx} style={styles.weekdayText}>
                        {day}
                    </Text>
                ))}
            </View>

            {/* Calendar Days */}
            <View>
                {daysInMonth.map((week, weekIdx) => (
                    <View key={weekIdx} style={styles.weekRow}>
                        {week.map((date, dayIdx) => {
                            if (!date) {
                                return <View key={dayIdx} style={styles.emptyDay} />;
                            }

                            const disabled = isDisabled(date);
                            const selected = isSelected(date);
                            const today = isToday(date);

                            return (
                                <TouchableOpacity
                                    key={dayIdx}
                                    style={[
                                        styles.dayBtn,
                                        selected && styles.dayBtnSelected,
                                        today && !selected && styles.dayBtnToday,
                                        disabled && styles.dayBtnDisabled,
                                    ]}
                                    onPress={() => handleSelectDate(date)}
                                    disabled={disabled}
                                    activeOpacity={disabled ? 1 : 0.7}
                                >
                                    <Text
                                        style={[
                                            styles.dayText,
                                            selected && styles.dayTextSelected,
                                            disabled && styles.dayTextDisabled,
                                        ]}
                                    >
                                        {date.getDate()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.legendDotToday]} />
                    <Text style={styles.legendText}>Hôm nay</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.legendDotDisabled]} />
                    <Text style={styles.legendText}>Đã đặt/Không khả dụng</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
    },
    title: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0f172a",
        marginBottom: 12,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    monthText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0f172a",
    },
    weekdayRow: {
        flexDirection: "row",
        marginBottom: 8,
    },
    weekdayText: {
        flex: 1,
        textAlign: "center",
        fontSize: 12,
        fontWeight: "600",
        color: "#64748b",
        paddingVertical: 8,
    },
    weekRow: {
        flexDirection: "row",
    },
    dayBtn: {
        flex: 1,
        aspectRatio: 1,
        justifyContent: "center",
        alignItems: "center",
        margin: 2,
        borderRadius: 8,
        backgroundColor: "#f8fafc",
    },
    dayBtnSelected: {
        backgroundColor: "#0891b2",
    },
    dayBtnToday: {
        borderWidth: 2,
        borderColor: "#0891b2",
    },
    dayBtnDisabled: {
        backgroundColor: "#f1f5f9",
        opacity: 0.5,
    },
    dayText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0f172a",
    },
    dayTextSelected: {
        color: "#fff",
        fontWeight: "700",
    },
    dayTextDisabled: {
        color: "#cbd5e1",
    },
    emptyDay: {
        flex: 1,
        margin: 2,
    },
    legend: {
        flexDirection: "row",
        gap: 16,
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 2,
    },
    legendDotToday: {
        borderWidth: 2,
        borderColor: "#0891b2",
        backgroundColor: "#e0f2fe",
    },
    legendDotDisabled: {
        backgroundColor: "#cbd5e1",
    },
    legendText: {
        fontSize: 11,
        color: "#64748b",
    },
});
