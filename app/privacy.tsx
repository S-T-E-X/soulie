import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>Gizlilik Politikası</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Son güncelleme: 18 Mart 2026</Text>

        <Text style={styles.sectionTitle}>Giriş</Text>
        <Text style={styles.bodyText}>
          Soulie'ye hoş geldiniz. Soulie, yapay zeka destekli bir arkadaş uygulamasıdır. Gizliliğinizi korumaya kararlıyız. Bu Gizlilik Politikası, mobil uygulamamızı (sohbet, video etkileşimi ve mistik özellikler dahil) kullanırken verilerinizi nasıl topladığımızı, kullandığımızı ve koruduğumuzu açıklar.
        </Text>

        <Text style={styles.sectionTitle}>Bilgi Toplama ve Depolama</Text>
        <Text style={styles.bodyText}>
          Kusursuz bir "Derin Bellek" deneyimi sunmak için verileri güvenli PostgreSQL veritabanımızda toplarız ve saklarız:
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Hesap Bilgileri:</Text> Kaydolduğunuzda, VIP aboneliklerinizi ve tercihlerinizi yönetmek için e-posta adresiniz ve benzersiz Kullanıcı Kimliğiniz toplanır.
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Etkileşim Verileri:</Text> Tüm sohbet mesajları, karakter kişilik ayarları ve kullanıcı tercihleri, yapay zeka arkadaşınızın sizi "hatırlaması" için saklanır.
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Mistik Özellikler Verileri:</Text> Tarot veya Fal verme için sağlanan bilgiler (örn. burç veya doğum tarihi) yalnızca okumalarınızı oluşturmak için işlenir.
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Teknik Veriler:</Text> Dolandırıcılığı önlemek ve uygulama performansını iyileştirmek için cihaz bilgileri (model, OS sürümü) ve IP adresleri toplanabilir.
        </Text>

        <Text style={styles.sectionTitle}>AI İşleme ve Üçüncü Taraf Sağlayıcılar</Text>
        <Text style={styles.bodyText}>
          Soulie, gerçekçi konuşmalar oluşturmak için OpenAI ve diğer üçüncü taraf API sağlayıcılarından gelen gelişmiş yapay zeka modellerini kullanır:
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Veri Maskeleme:</Text> E-posta veya gerçek adınız gibi kişisel kimlik bilgilerinizi OpenAI'ye paylaşmayız. Yalnızca sohbetinizin metni işleme için gönderilir.
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Model Eğitimi:</Text> Üçüncü taraf sağlayıcılarımızın özel konuşmalarınızı küresel modelleri eğitmek için kullanmasına açıkça izin vermeyiz, gizliliğiniz korunur.
        </Text>

        <Text style={styles.sectionTitle}>Veri Güvenliği</Text>
        <Text style={styles.bodyText}>
          Güveniniz bizim önceliğimiz. Endüstri standardı güvenlik önlemleri uygularız:
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Şifreli Depolama:</Text> PostgreSQL veritabanımızdaki tüm konuşma günlükleri sunucu tarafı şifrelemesiyle korunur.
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>HTTPS/SSL:</Text> Cihazınız ile sunucularımız arasındaki veri iletişimi tamamen şifreli SSL/TLS kanalları üzerinden gerçekleşir.
        </Text>

        <Text style={styles.sectionTitle}>Uygulama İçi Satın Almalar ve Abonelikler</Text>
        <Text style={styles.bodyText}>
          VIP üyelikleri veya tüm finansal işlemler Apple App Store (IAP) tarafından yönetilir. Soulie, kredi kartı veya fatura bilgilerinizi kendi sunucularında saklamaz.
        </Text>

        <Text style={styles.sectionTitle}>Kullanıcı Hakları ve Veri Silme</Text>
        <Text style={styles.bodyText}>
          Küresel gizlilik standartlarına uygun olarak, aşağıdaki haklara sahipsiniz:
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Erişim:</Text> Saklanan verilerinizin bir özetini talep edebilirsiniz.
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Silme:</Text> Hesabınızı ve tüm ilişkili sohbet günlüklerini "Ayarlar" menüsünden veya destek ile iletişime geçerek kalıcı olarak silebilirsiniz.
        </Text>

        <Text style={styles.sectionTitle}>Yaş Derecelendirmesi ve Yetişkin İçerik</Text>
        <Text style={styles.bodyText}>
          Soulie 17+ (Yetişkin) olarak derecelendirilmiştir. 17 yaşından küçük bireylerden bilinçli olarak veri toplamayız. Yapay zeka, yetişkin yönelimli konuşmalarla sorumlu bir şekilde başa çıkmak için programlandı, ancak ebeveyn takdirine bırakılır.
        </Text>

        <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
        <Text style={styles.bodyText}>
          Verileriniz veya bu politika hakkında herhangi bir sorunuz için lütfen bize ulaşın:{"\n"}
          Destek E-postası: help@cszone.gg{"\n"}
          Geliştirici: Zone Digital LLC
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#111",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  lastUpdated: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#AAA",
    marginBottom: 24,
  },
  placeholder: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  placeholderTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: "#888",
  },
  placeholderText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#AAA",
    textAlign: "center",
    lineHeight: 22,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#444",
    lineHeight: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#111",
    marginTop: 24,
    marginBottom: 8,
  },
});
