import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, TextInput, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '../../src/services/api';
import { Colors, BorderRadius, Shadow } from '../../src/theme';

export default function RadiologyCentersScreen() {
    const router = useRouter();
    const [centers, setCenters] = useState<any[]>([]);
    const [filteredCenters, setFilteredCenters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProvince, setSelectedProvince] = useState<string>('');

    useEffect(() => { loadCenters(); }, []);

    useEffect(() => {
        filterCenters();
    }, [searchQuery, selectedProvince, centers]);

    const loadCenters = async () => {
        try {
            const data = await api.getRadiologyCenters();
            setCenters(data || []);
            setFilteredCenters(data || []);
        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    };

    const filterCenters = () => {
        let filtered = [...centers];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(center => 
                center.name?.toLowerCase().includes(query) ||
                center.city?.toLowerCase().includes(query) ||
                center.province?.toLowerCase().includes(query)
            );
        }

        if (selectedProvince) {
            filtered = filtered.filter(center => center.province === selectedProvince);
        }

        setFilteredCenters(filtered);
    };

    const provinces = Array.from(new Set(centers.map(c => c.province).filter(Boolean)));

    const renderCenter = ({ item, index }: any) => (
        <Animated.View entering={FadeInDown.delay(index * 60)} style={styles.card}>
            <TouchableOpacity 
                style={styles.cardContent}
                onPress={() => router.push(`/(patient)/radiology/${item.id}` as any)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.centerName}>{item.name}</Text>
                        {item.city && (
                            <View style={styles.locationRow}>
                                <Text style={styles.locationText}>{item.city}</Text>
                                <Ionicons name="location" size={14} color="#6B7280" />
                            </View>
                        )}
                    </View>
                    <View style={styles.iconCircle}>
                        <MaterialCommunityIcons name="radiology-box" size={28} color="#8B5CF6" />
                    </View>
                </View>

                {item.phone && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoText}>{item.phone}</Text>
                        <Ionicons name="call" size={14} color="#6B7280" />
                    </View>
                )}

                {item.working_hours && (
                    <View style={styles.workingHoursBox}>
                        <Text style={styles.workingHoursLabel}>ساعات العمل:</Text>
                        <Text style={styles.workingHoursText}>
                            {item.working_hours.morning || 'غير محدد'}
                        </Text>
                    </View>
                )}

                <View style={styles.cardFooter}>
                    <View style={styles.viewBtn}>
                        <Text style={styles.viewBtnText}>عرض التفاصيل</Text>
                        <Ionicons name="chevron-back" size={16} color="#8B5CF6" />
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient 
                colors={['#8B5CF6', '#6366F1']} 
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>مراكز الأشعة والتصوير</Text>
                    <View style={{ width: 28 }} />
                </View>

                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ابحث عن مركز أشعة..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        textAlign="right"
                    />
                </View>
            </LinearGradient>

            {provinces.length > 0 && (
                <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>المحافظة:</Text>
                    <View style={styles.filterChips}>
                        <TouchableOpacity
                            style={[styles.filterChip, !selectedProvince && styles.filterChipActive]}
                            onPress={() => setSelectedProvince('')}
                        >
                            <Text style={[styles.filterChipText, !selectedProvince && styles.filterChipTextActive]}>
                                الكل
                            </Text>
                        </TouchableOpacity>
                        {provinces.slice(0, 5).map((province) => (
                            <TouchableOpacity
                                key={province}
                                style={[styles.filterChip, selectedProvince === province && styles.filterChipActive]}
                                onPress={() => setSelectedProvince(province)}
                            >
                                <Text style={[styles.filterChipText, selectedProvince === province && styles.filterChipTextActive]}>
                                    {province}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            <FlatList
                data={filteredCenters}
                renderItem={renderCenter}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="radiology-box-outline" size={64} color="#D1D5DB" />
                        <Text style={styles.emptyText}>لا توجد مراكز أشعة</Text>
                        {searchQuery && (
                            <Text style={styles.emptySubtext}>جرب البحث بكلمات مختلفة</Text>
                        )}
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { 
        paddingTop: Platform.OS === 'ios' ? 60 : 45, 
        paddingBottom: 20, 
        paddingHorizontal: 20 
    },
    headerTop: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 16
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    searchBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: 'rgba(255,255,255,0.95)', 
        borderRadius: BorderRadius.lg, 
        paddingHorizontal: 16, 
        height: 48,
        gap: 10
    },
    searchInput: { 
        flex: 1, 
        fontSize: 14, 
        color: Colors.text,
        textAlign: 'right'
    },
    filterSection: { 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        backgroundColor: Colors.white 
    },
    filterLabel: { 
        fontSize: 13, 
        fontWeight: '700', 
        color: Colors.textSecondary, 
        marginBottom: 8,
        textAlign: 'right'
    },
    filterChips: { 
        flexDirection: 'row-reverse', 
        flexWrap: 'wrap', 
        gap: 8 
    },
    filterChip: { 
        paddingHorizontal: 14, 
        paddingVertical: 6, 
        borderRadius: BorderRadius.md, 
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    filterChipActive: { 
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6'
    },
    filterChipText: { 
        fontSize: 13, 
        fontWeight: '600', 
        color: Colors.textSecondary 
    },
    filterChipTextActive: { color: '#FFF' },
    listContent: { 
        padding: 16, 
        paddingBottom: 100 
    },
    card: { 
        backgroundColor: Colors.white, 
        borderRadius: BorderRadius.lg, 
        marginBottom: 12,
        ...Shadow.small
    },
    cardContent: { padding: 16 },
    cardHeader: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        gap: 12,
        marginBottom: 12
    },
    iconCircle: { 
        width: 56, 
        height: 56, 
        borderRadius: 28, 
        backgroundColor: '#F3E8FF', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    centerName: { 
        fontSize: 17, 
        fontWeight: '800', 
        color: Colors.text,
        textAlign: 'right'
    },
    locationRow: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        gap: 4, 
        marginTop: 4 
    },
    locationText: { 
        fontSize: 13, 
        color: '#6B7280' 
    },
    infoRow: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        gap: 6,
        marginBottom: 8
    },
    infoText: { 
        fontSize: 13, 
        color: Colors.textSecondary 
    },
    workingHoursBox: { 
        backgroundColor: Colors.background, 
        padding: 10, 
        borderRadius: BorderRadius.md,
        marginBottom: 12
    },
    workingHoursLabel: { 
        fontSize: 11, 
        fontWeight: '700', 
        color: Colors.textMuted,
        marginBottom: 4,
        textAlign: 'right'
    },
    workingHoursText: { 
        fontSize: 13, 
        color: Colors.text,
        textAlign: 'right'
    },
    cardFooter: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'flex-end',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.background
    },
    viewBtn: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        gap: 4 
    },
    viewBtnText: { 
        fontSize: 14, 
        fontWeight: '700', 
        color: '#8B5CF6' 
    },
    empty: { 
        alignItems: 'center', 
        marginTop: 80, 
        gap: 12 
    },
    emptyText: { 
        fontSize: 16, 
        fontWeight: '600', 
        color: Colors.textSecondary 
    },
    emptySubtext: { 
        fontSize: 13, 
        color: Colors.textMuted 
    },
});
