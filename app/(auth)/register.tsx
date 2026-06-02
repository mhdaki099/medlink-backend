import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Image,
    Modal,
    FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { SYRIA_GOVERNORATES, getGovernorates, getDistricts, getSubDistricts } from '../../src/data/syriaLocations';

const { width, height } = Dimensions.get('window');

const ROLES = [
    { id: 'patient', label: 'مريض', icon: 'account-heart-outline' },
    { id: 'doctor', label: 'طبيب', icon: 'stethoscope' },
    { id: 'pharmacy', label: 'صيدلية', icon: 'pill' },
    { id: 'lab', label: 'مختبر', icon: 'flask-outline' },
    { id: 'radiology', label: 'مركز أشعة', icon: 'radiology-box-outline' },
    { id: 'warehouse', label: 'مستودع', icon: 'truck-fast-outline' },
] as const;

export default function RegisterScreen() {
    const router = useRouter();
    const { register, isLoading: authLoading } = useAuth();
    const [localLoading, setLocalLoading] = useState(false);

    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '', password: '', phone: '', city: '', address: '', role: 'patient',
        clinic_name: '', clinic_address: '', price_per_session: 0, experience_years: 0,
        available_hours: '', specialization: '', open_hours: '', drug_allergies_text: '',
        home_service_fee: 0, has_home_service: false,
        province: '', district: '', area: '',
    });

    const [photo, setPhoto] = useState<string | null>(null);
    const [documents, setDocuments] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
    const [cityModalVisible, setCityModalVisible] = useState(false);
    const [specModalVisible, setSpecModalVisible] = useState(false);
    const [timeModalVisible, setTimeModalVisible] = useState(false);
    const [governorateModalVisible, setGovernorateModalVisible] = useState(false);
    const [districtModalVisible, setDistrictModalVisible] = useState(false);
    const [areaModalVisible, setAreaModalVisible] = useState(false);
    const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
    const logoAnim = useRef(new Animated.Value(0)).current;

    // Generate time slots from 6 AM to 10 PM
    const generateTimeSlots = () => {
        const slots: string[] = [];
        for (let hour = 6; hour <= 22; hour++) {
            const period = hour >= 12 ? 'مساءً' : 'صباحاً';
            const displayHour = hour > 12 ? hour - 12 : hour;
            slots.push(`${displayHour}:00 ${period}`);
            slots.push(`${displayHour}:30 ${period}`);
        }
        return slots;
    };

    const timeSlots = generateTimeSlots();

    const selectedGovernorate = SYRIA_GOVERNORATES.find(g => g.name === form.province);
    const selectedDistrict = selectedGovernorate?.districts.find(d => d.name === form.district);

    const toggleTimeSelection = (time: string) => {
        setSelectedTimes(prev => {
            if (prev.includes(time)) {
                return prev.filter(t => t !== time);
            }
            return [...prev, time].sort();
        });
    };

    const confirmTimeSelection = () => {
        const timeString = selectedTimes.join('، ');
        // Determine which field to update based on role
        if (form.role === 'doctor') {
            update('available_hours', timeString);
        } else {
            update('open_hours', timeString);
        }
        setTimeModalVisible(false);
    };

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(logoAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
                Animated.timing(logoAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const update = (field: string, val: string | number) => setForm(f => ({ ...f, [field]: val }));

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images' as any,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setPhoto(result.assets[0].uri);
        }
    };

    const pickDocument = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
            multiple: true,
        });

        if (!result.canceled) {
            setDocuments(result.assets);
        }
    };

    const handleRegister = async () => {
        if (!form.first_name || !form.last_name || !form.phone || !form.password || !form.province || !form.district || !form.area) {
            Alert.alert('تنبيه', 'يرجى تعبئة جميع الحقول الأساسية بما فيها المحافظة والمنطقة والناحية');
            return;
        }

        if (form.role === 'doctor' && (!form.clinic_name || !form.clinic_address)) {
            Alert.alert('تنبيه', 'يرجى تعبئة بيانات العيادة');
            return;
        }

        if (form.role === 'doctor' && (!form.specialization || !form.available_hours || !form.price_per_session)) {
            Alert.alert('تنبيه', 'يرجى إدخال التخصص، ساعات العمل، وسعر الكشفية');
            return;
        }

        setLocalLoading(true);
        try {
            const { api } = require('../../src/services/api');
            let photoUrl = '';
            let documentUrls: string[] = [];

            // 1. Upload Photo if exists
            if (photo) {
                const res = await api.uploadFile(photo, 'photo');
                photoUrl = res.url;
            }

            // 2. Upload Documents
            for (const doc of documents) {
                const res = await api.uploadFile(doc.uri, 'document');
                documentUrls.push(res.url);
            }

            // 3. Register with full data
            const payload = {
                ...form,
                drug_allergies: form.drug_allergies_text.split(',').map((x: string) => x.trim()).filter(Boolean),
                photo: photoUrl,
                documents: documentUrls,
                // Set city to province for backward compatibility
                city: form.province
            };

            const res = await register(payload);
            if (res?.status === 'pending') {
                Alert.alert('طلب قيد المراجعة', res.message || 'تم استلام طلبك وبانتظار موافقة الإدارة.', [
                    { text: 'حسناً', onPress: () => router.replace('/(auth)/login') }
                ]);
            } else {
                router.replace(`/(${form.role})` as any);
            }
        } catch (e: any) {
            Alert.alert('خطأ في التسجيل', e.message || 'حدث خطأ أثناء إنشاء الحساب');
        } finally {
            setLocalLoading(false);
        }
    };

    const logoTranslateY = logoAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10],
    });

    const isLoading = authLoading || localLoading;

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#FFFFFF' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView style={styles.container} bounces={false} showsVerticalScrollIndicator={false}>
                <View style={styles.headerWrapper}>
                    <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.headerGradient} />
                    <View style={styles.blob1} />
                    <View style={styles.blob2} />
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <MaterialCommunityIcons name="chevron-left" size={32} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <Animated.View style={[styles.logoContainer, { transform: [{ translateY: logoTranslateY }] }]}>
                            <Image
                                source={require('../../assets/Logo Design.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </Animated.View>
                        <Text style={styles.headerText}>إنشاء حساب جديد</Text>
                    </View>
                </View>

                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>اختر نوع الحساب</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rolesScroll}>
                        {ROLES.map(r => (
                            <TouchableOpacity
                                key={r.id}
                                style={[styles.roleChip, form.role === r.id && styles.roleChipActive]}
                                onPress={() => update('role', r.id)}
                            >
                                <MaterialCommunityIcons
                                    name={r.icon as any}
                                    size={20}
                                    color={form.role === r.id ? '#FFFFFF' : '#1E88E5'}
                                />
                                <Text style={[styles.roleChipText, form.role === r.id && { color: '#FFFFFF' }]}>
                                    {r.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.form}>
                        {form.role !== 'patient' && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={styles.sectionTitle}>الوثائق والصورة الشخصية</Text>
                                <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
                                    <TouchableOpacity style={[styles.uploadBox, photo && styles.uploadBoxActive]} onPress={pickImage}>
                                        {photo ? (
                                            <Image source={{ uri: photo }} style={styles.previewImage} />
                                        ) : (
                                            <>
                                                <MaterialCommunityIcons name="camera" size={24} color="#3B82F6" />
                                                <Text style={styles.uploadText}>الصورة الشخصية</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.uploadBox, documents.length > 0 && styles.uploadBoxActive]} onPress={pickDocument}>
                                        <MaterialCommunityIcons name="file-document-outline" size={24} color={documents.length > 0 ? '#FFF' : '#3B82F6'} />
                                        <Text style={[styles.uploadText, documents.length > 0 && { color: '#FFF' }]}>
                                            {documents.length > 0 ? `${documents.length} ملفات مختارة` : 'الشهادات والوثائق'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <View style={{ flexDirection: 'row-reverse', gap: 12, marginBottom: 16 }}>
                            <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="الاسم الأول"
                                    placeholderTextColor="#9CA3AF"
                                    value={form.first_name}
                                    onChangeText={v => update('first_name', v)}
                                />
                            </View>
                            <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="الكنية"
                                    placeholderTextColor="#9CA3AF"
                                    value={form.last_name}
                                    onChangeText={v => update('last_name', v)}
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="email-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="البريد الإلكتروني"
                                placeholderTextColor="#9CA3AF"
                                value={form.email}
                                onChangeText={v => update('email', v)}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="lock-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="كلمة المرور"
                                placeholderTextColor="#9CA3AF"
                                value={form.password}
                                onChangeText={v => update('password', v)}
                                secureTextEntry
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="phone-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="رقم الهاتف"
                                placeholderTextColor="#9CA3AF"
                                value={form.phone}
                                onChangeText={v => update('phone', v)}
                                keyboardType="phone-pad"
                            />
                        </View>

                        {/* Governorate Selection */}
                    <TouchableOpacity
                        style={styles.inputWrapper}
                        activeOpacity={0.7}
                        onPress={() => setGovernorateModalVisible(true)}
                    >
                        <MaterialCommunityIcons name="map-marker-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <Text style={[styles.input, !form.province && { color: '#9CA3AF' }]}>
                            {form.province || 'المحافظة *'}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    {/* District Selection */}
                    <TouchableOpacity
                        style={[styles.inputWrapper, !form.province && { opacity: 0.5 }]}
                        activeOpacity={0.7}
                        onPress={() => form.province && setDistrictModalVisible(true)}
                        disabled={!form.province}
                    >
                        <MaterialCommunityIcons name="map-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <Text style={[styles.input, !form.district && { color: '#9CA3AF' }]}>
                            {form.district || 'المنطقة *'}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    {/* Area Selection */}
                    <TouchableOpacity
                        style={[styles.inputWrapper, (!form.province || !form.district) && { opacity: 0.5 }]}
                        activeOpacity={0.7}
                        onPress={() => form.province && form.district && setAreaModalVisible(true)}
                        disabled={!form.province || !form.district}
                    >
                        <MaterialCommunityIcons name="home-map-marker" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <Text style={[styles.input, !form.area && { color: '#9CA3AF' }]}>
                            {form.area || 'الناحية/الحي *'}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                        {/* Address field (Req #11) */}
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="home-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="العنوان التفصيلي"
                                placeholderTextColor="#9CA3AF"
                                value={form.address}
                                onChangeText={v => update('address', v)}
                            />
                        </View>

                        {form.role === 'doctor' && (
                            <>
                                {/* Specialization Picker (Req #1) */}
                                <TouchableOpacity
                                    style={styles.inputWrapper}
                                    activeOpacity={0.7}
                                    onPress={() => setSpecModalVisible(true)}
                                >
                                    <MaterialCommunityIcons name="stethoscope" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                    <Text style={[styles.input, !form.specialization && { color: '#9CA3AF' }]}>
                                        {form.specialization || 'التخصص الطبي *'}
                                    </Text>
                                    <MaterialCommunityIcons name="chevron-down" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                                <View style={styles.inputWrapper}>
                                    <MaterialCommunityIcons name="hospital-building" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="اسم العيادة"
                                        placeholderTextColor="#9CA3AF"
                                        value={form.clinic_name}
                                        onChangeText={v => update('clinic_name', v)}
                                    />
                                </View>
                                <View style={styles.inputWrapper}>
                                    <MaterialCommunityIcons name="map-marker-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="موقع العيادة"
                                        placeholderTextColor="#9CA3AF"
                                        value={form.clinic_address}
                                        onChangeText={v => update('clinic_address', v)}
                                    />
                                </View>
                                <View style={styles.inputWrapper}>
                                    <MaterialCommunityIcons name="cash-multiple" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="سعر الكشفية"
                                        placeholderTextColor="#9CA3AF"
                                        value={form.price_per_session.toString()}
                                        onChangeText={v => update('price_per_session', parseInt(v) || 0)}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.inputWrapper}>
                                    <MaterialCommunityIcons name="briefcase-clock-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="سنوات الخبرة"
                                        placeholderTextColor="#9CA3AF"
                                        value={form.experience_years.toString()}
                                        onChangeText={v => update('experience_years', parseInt(v) || 0)}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <TouchableOpacity
                                    style={styles.inputWrapper}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setSelectedTimes(form.available_hours ? form.available_hours.split('، ').filter(Boolean) : []);
                                        setTimeModalVisible(true);
                                    }}
                                >
                                    <MaterialCommunityIcons name="clock-time-four-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                    <Text style={[styles.input, !form.available_hours && { color: '#9CA3AF' }]}>
                                        {form.available_hours || 'اختر ساعات العمل *'}
                                    </Text>
                                    <MaterialCommunityIcons name="chevron-down" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            </>
                        )}

                        {form.role === 'patient' && (
                            <View style={styles.inputWrapper}>
                                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="حساسية الأدوية (اختياري)"
                                    placeholderTextColor="#9CA3AF"
                                    value={form.drug_allergies_text}
                                    onChangeText={v => update('drug_allergies_text', v)}
                                />
                            </View>
                        )}

                        {['pharmacy', 'lab', 'radiology', 'warehouse'].includes(form.role) && (
                            <TouchableOpacity
                                style={styles.inputWrapper}
                                activeOpacity={0.7}
                                onPress={() => {
                                    setSelectedTimes(form.open_hours ? form.open_hours.split('، ').filter(Boolean) : []);
                                    setTimeModalVisible(true);
                                }}
                            >
                                <MaterialCommunityIcons name="clock-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <Text style={[styles.input, !form.open_hours && { color: '#9CA3AF' }]}>
                                    {form.open_hours || 'اختر ساعات العمل *'}
                                </Text>
                                <MaterialCommunityIcons name="chevron-down" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}

                        {['lab', 'radiology'].includes(form.role) && (
                            <>
                                <View style={styles.inputWrapper}>
                                    <MaterialCommunityIcons name="home-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="رسوم الخدمة المنزلية (0 إذا غير متاحة)"
                                        placeholderTextColor="#9CA3AF"
                                        value={(form as any).home_service_fee?.toString() || '0'}
                                        onChangeText={v => update('home_service_fee', parseFloat(v) || 0)}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </>
                        )}

                        <TouchableOpacity
                            style={[styles.registerBtn, isLoading && { opacity: 0.8 }]}
                            onPress={handleRegister}
                            disabled={isLoading}
                        >
                            <LinearGradient
                                colors={['#1E88E5', '#43A047']}
                                style={styles.btnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>إنشاء حساب</Text>}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.loginLink}>
                            <Text style={styles.loginLinkText}>
                                لديك حساب بالفعل؟ <Text style={styles.loginHighlight}>تسجيل الدخول</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Governorate Picker Modal */}
            <Modal visible={governorateModalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>اختر المحافظة</Text>
                            <TouchableOpacity onPress={() => setGovernorateModalVisible(false)} style={styles.closeBtn}>
                                <MaterialCommunityIcons name="close" size={24} color="#111827" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={getGovernorates()}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.cityItem}
                                    onPress={() => {
                                        update('province', item.name);
                                        update('district', '');
                                        update('area', '');
                                        setGovernorateModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.cityItemText}>{item.name}</Text>
                                    {form.province === item.name && <MaterialCommunityIcons name="check" size={20} color="#1E88E5" />}
                                </TouchableOpacity>
                            )}
                            ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
                        />
                    </View>
                </View>
            </Modal>

            {/* District Picker Modal */}
            <Modal visible={districtModalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>اختر المنطقة</Text>
                            <TouchableOpacity onPress={() => setDistrictModalVisible(false)} style={styles.closeBtn}>
                                <MaterialCommunityIcons name="close" size={24} color="#111827" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={selectedGovernorate ? getDistricts(selectedGovernorate.id) : []}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.cityItem}
                                    onPress={() => {
                                        update('district', item.name);
                                        update('area', '');
                                        setDistrictModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.cityItemText}>{item.name}</Text>
                                    {form.district === item.name && <MaterialCommunityIcons name="check" size={20} color="#1E88E5" />}
                                </TouchableOpacity>
                            )}
                            ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
                        />
                    </View>
                </View>
            </Modal>

            {/* Area Picker Modal */}
            <Modal visible={areaModalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>اختر الناحية/الحي</Text>
                            <TouchableOpacity onPress={() => setAreaModalVisible(false)} style={styles.closeBtn}>
                                <MaterialCommunityIcons name="close" size={24} color="#111827" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={selectedGovernorate && selectedDistrict ? getSubDistricts(selectedGovernorate.id, selectedDistrict.id) : []}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.cityItem}
                                    onPress={() => {
                                        update('area', item.name);
                                        setAreaModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.cityItemText}>{item.name}</Text>
                                    {form.area === item.name && <MaterialCommunityIcons name="check" size={20} color="#1E88E5" />}
                                </TouchableOpacity>
                            )}
                            ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
                        />
                    </View>
                </View>
            </Modal>

            {/* Time Picker Modal */}
            <Modal visible={timeModalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: height * 0.8 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>اختر ساعات العمل</Text>
                            <TouchableOpacity onPress={() => setTimeModalVisible(false)} style={styles.closeBtn}>
                                <MaterialCommunityIcons name="close" size={24} color="#111827" />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 14, color: '#6B7280', marginBottom: 12, textAlign: 'right' }}>
                            اضغط على الأوقات المتاحة لديك (صباحاً ومساءً)
                        </Text>
                        <FlatList
                            data={timeSlots}
                            keyExtractor={(item) => item}
                            numColumns={3}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                const isSelected = selectedTimes.includes(item);
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.timeSlotItem,
                                            isSelected && styles.timeSlotItemSelected
                                        ]}
                                        onPress={() => toggleTimeSelection(item)}
                                    >
                                        <Text style={[
                                            styles.timeSlotText,
                                            isSelected && styles.timeSlotTextSelected
                                        ]}>
                                            {item}
                                        </Text>
                                        {isSelected && (
                                            <MaterialCommunityIcons name="check-circle" size={16} color="#FFFFFF" style={{ marginTop: 4 }} />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                            contentContainerStyle={{ paddingBottom: 100 }}
                        />
                        {selectedTimes.length > 0 && (
                            <View style={styles.selectedTimesSummary}>
                                <Text style={styles.selectedTimesLabel}>الأوقات المحددة:</Text>
                                <Text style={styles.selectedTimesText}>{selectedTimes.join('، ')}</Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.confirmTimeBtn} onPress={confirmTimeSelection}>
                            <Text style={styles.confirmTimeBtnText}>تأكيد الاختيار</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Specialization Picker Modal */}
            <Modal visible={specModalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>اختر التخصص الطبي</Text>
                            <TouchableOpacity onPress={() => setSpecModalVisible(false)} style={styles.closeBtn}>
                                <MaterialCommunityIcons name="close" size={24} color="#111827" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={[
                                'قلبية', 'طب الأطفال', 'هضمية', 'الجهاز التنفسي',
                                'جلدية وتجميل', 'عظام ومفاصل', 'طب العيون', 'بلعوم',
                                'طب الأسنان', 'طب الأعصاب', 'طب عام', 'جراحة عامة',
                                'نسائية وتوليد', 'طب نفسي', 'مسالك بولية'
                            ]}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.cityItem}
                                    onPress={() => {
                                        update('specialization', item);
                                        setSpecModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.cityItemText}>{item}</Text>
                                    {form.specialization === item && <MaterialCommunityIcons name="check" size={20} color="#1E88E5" />}
                                </TouchableOpacity>
                            )}
                            ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
                        />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerWrapper: { height: height * 0.3, width: '100%', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    headerGradient: { ...StyleSheet.absoluteFillObject, borderBottomLeftRadius: 100, borderBottomRightRadius: 20, transform: [{ scaleX: 1.2 }] },
    blob1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255, 255, 255, 0.12)', top: -80, right: -40 },
    blob2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255, 255, 255, 0.1)', bottom: -40, left: -60 },
    backBtn: { position: 'absolute', left: 24, top: Platform.OS === 'web' ? 40 : 60, zIndex: 10 },
    headerContent: { alignItems: 'center', marginTop: 10 },
    logoContainer: { width: 120, height: 60, marginBottom: 8 },
    logoImage: { width: '100%', height: '100%', tintColor: '#FFFFFF' },
    headerText: { fontSize: 28, fontFamily: 'Cairo_700Bold', color: '#FFFFFF' },
    content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
    sectionTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'right', marginBottom: 12 },
    rolesScroll: { flexDirection: 'row', marginBottom: 20 },
    roleChip: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F8F5', marginLeft: 10, borderWidth: 1, borderColor: '#C8E6C9' },
    roleChipActive: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
    roleChipText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#1E88E5', marginRight: 6 },
    form: { marginTop: 10 },
    inputWrapper: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 16, height: 60, marginBottom: 16 },
    inputIcon: { marginLeft: 12 },
    input: { flex: 1, fontSize: 15, fontFamily: 'Cairo_400Regular', color: '#111827', textAlign: 'right' },
    uploadBox: { flex: 1, height: 80, backgroundColor: '#F3F8FF', borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#3B82F6', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    uploadBoxActive: { backgroundColor: '#3B82F6', borderStyle: 'solid' },
    uploadText: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#3B82F6', marginTop: 4, textAlign: 'center' },
    previewImage: { width: '100%', height: '100%', borderRadius: 14 },
    registerBtn: { height: 60, borderRadius: 30, overflow: 'hidden', marginTop: 10, marginBottom: 20 },
    btnGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    btnText: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#FFFFFF' },
    loginLink: { alignItems: 'center' },
    loginLinkText: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#6B7280' },
    loginHighlight: { color: '#1E88E5', fontFamily: 'Cairo_700Bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: height * 0.7, padding: 24 },
    modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#111827' },
    closeBtn: { padding: 4 },
    cityItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
    cityItemText: { fontSize: 16, fontFamily: 'Cairo_400Regular', color: '#111827' },
    modalDivider: { height: 1, backgroundColor: '#F3F4F6' },
    // Time picker styles
    timeSlotItem: { flex: 1, alignItems: 'center', justifyContent: 'center', margin: 4, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 60 },
    timeSlotItemSelected: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
    timeSlotText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#374151', textAlign: 'center' },
    timeSlotTextSelected: { color: '#FFFFFF', fontFamily: 'Cairo_700Bold' },
    selectedTimesSummary: { backgroundColor: '#F0F8F5', borderRadius: 12, padding: 16, marginTop: 12, marginBottom: 16, borderWidth: 1, borderColor: '#C8E6C9' },
    selectedTimesLabel: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#2E7D32', marginBottom: 8, textAlign: 'right' },
    selectedTimesText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#374151', textAlign: 'right', lineHeight: 22 },
    confirmTimeBtn: { backgroundColor: '#1E88E5', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    confirmTimeBtnText: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#FFFFFF' },
});
