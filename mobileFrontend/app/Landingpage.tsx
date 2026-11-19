import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────
// Content — edit these lists to match the salon's actual menu
// ─────────────────────────────────────────────────────────────
type IconName = keyof typeof Ionicons.glyphMap;

// NOTE: require() needs static paths, so the four images are listed explicitly.
// If your images are directly inside /assets (not /assets/images), change these paths.
const RESULTS = [
  {
    image: require("@/assets/images/output1.jpg"),
    title: "Rich Auburn Color",
    caption: "Deep, warm color with a glossy finish",
  },
  {
    image: require("@/assets/images/output2.jpg"),
    title: "Glossy & Smooth",
    caption: "Sleek, frizz-free shine from root to tip",
  },
  {
    image: require("@/assets/images/output3.jpg"),
    title: "Warm Copper Brown",
    caption: "Soft, healthy-looking color that glows",
  },
  {
    image: require("@/assets/images/output4.jpg"),
    title: "Long, Sleek & Shiny",
    caption: "Silky straight hair that lasts",
  },
];

const SERVICES: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "cut-outline",
    title: "Haircuts & Styling",
    description: "Fresh cuts and styles for men and women.",
  },
  {
    icon: "color-palette-outline",
    title: "Hair Color",
    description: "From natural browns to rich auburn and copper shades.",
  },
  {
    icon: "sparkles-outline",
    title: "Smoothing & Straightening",
    description: "Sleek, glossy, frizz-free hair that lasts.",
  },
  {
    icon: "water-outline",
    title: "Hair Treatments",
    description: "Spa and hot oil treatments for shine and softness.",
  },
  // Remove this one until nail services are live in the app
  {
    icon: "hand-left-outline",
    title: "Nail Care",
    description: "Manicure and pedicure services.",
  },
];

const BENEFITS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "calendar-outline",
    title: "Book anytime, anywhere",
    description: "Pick your services, date and time without calling or visiting.",
  },
  {
    icon: "people-outline",
    title: "Choose your stylist",
    description: "See ratings, reviews and availability before you book.",
  },
  {
    icon: "phone-portrait-outline",
    title: "Pay easily with GCash",
    description: "Reserve your slot with a 50% downpayment, or pay in full.",
  },
  {
    icon: "notifications-outline",
    title: "Stay updated",
    description: "Get notified about your bookings and confirmations.",
  },
  {
    icon: "time-outline",
    title: "Track your visits",
    description: "View your history and leave feedback for your stylist.",
  },
];

interface LandingPageProps {
  onGetStarted: () => void;
  onCreateAccount: () => void;
  onSkip: () => void;
}

export default function LandingPage({ onGetStarted, onCreateAccount, onSkip }: LandingPageProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // ── Results gallery (one image per page, auto-advances) ──
  const galleryRef = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const next = (indexRef.current + 1) % RESULTS.length;
      indexRef.current = next;
      setActiveIndex(next);
      galleryRef.current?.scrollTo({ x: next * width, animated: true });
    }, 4000);
    return () => clearInterval(id);
  }, [width]);

  const handleGalleryScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    indexRef.current = index;
    setActiveIndex(index);
  };

  const imageWidth = width - 48;

  return (
    <View className="flex-1 bg-[#fdf2f7]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 150 }}
      >
        {/* ── Hero ── */}
        <LinearGradient
          colors={["#ec4899", "#f472b6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 12,
            paddingBottom: 44,
            borderBottomLeftRadius: 36,
            borderBottomRightRadius: 36,
          }}
        >
          <View className="flex-row justify-end px-5">
            <TouchableOpacity onPress={onSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text className="text-white font-semibold text-sm">Skip</Text>
            </TouchableOpacity>
          </View>

          <View className="items-center px-6 mt-2">
            <View
              className="bg-white rounded-full items-center justify-center"
              style={{
                width: 132,
                height: 132,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Image
                source={require("@/assets/images/ROHS Logo.png")}
                style={{ width: 108, height: 108 }}
                resizeMode="contain"
              />
            </View>

            <Text className="text-white text-3xl font-bold text-center mt-5">
              Reshel Oco Hair Salon
            </Text>
            <Text className="text-white/90 text-base text-center mt-2 leading-6">
              Silky, shiny, salon-perfect hair — book your next visit in just a few taps.
            </Text>
          </View>
        </LinearGradient>

        {/* ── Services ── */}
        <View className="px-6 mt-8">
          <Text className="text-gray-800 text-2xl font-bold">What We Offer</Text>
          <Text className="text-gray-500 text-sm mt-1 mb-4">
            Everything you need to look and feel your best
          </Text>

          <View className="flex-row flex-wrap justify-between">
            {SERVICES.map((service) => (
              <View
                key={service.title}
                className="bg-white rounded-2xl p-4 mb-3"
                style={{
                  width: "48%",
                  shadowColor: "#ec4899",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View className="w-11 h-11 rounded-full bg-pink-100 items-center justify-center mb-3">
                  <Ionicons name={service.icon} size={22} color="#ec4899" />
                </View>
                <Text className="text-gray-800 font-bold text-sm">{service.title}</Text>
                <Text className="text-gray-500 text-xs mt-1 leading-4">{service.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Results gallery ── */}
        <View className="mt-6">
          <View className="px-6">
            <Text className="text-gray-800 text-2xl font-bold">Our Results</Text>
            <Text className="text-gray-500 text-sm mt-1 mb-4">
              Real hair, transformed right here in our salon
            </Text>
          </View>

          <ScrollView
            ref={galleryRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleGalleryScrollEnd}
          >
            {RESULTS.map((item) => (
              <View key={item.title} style={{ width, paddingHorizontal: 24 }}>
                <View
                  style={{
                    width: imageWidth,
                    aspectRatio: 3 / 4,
                    borderRadius: 28,
                    overflow: "hidden",
                    backgroundColor: "#f3f4f6",
                  }}
                >
                  <Image source={item.image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.65)"]}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      paddingHorizontal: 18,
                      paddingTop: 40,
                      paddingBottom: 18,
                    }}
                  >
                    <Text className="text-white text-lg font-bold">{item.title}</Text>
                    <Text className="text-white/85 text-xs mt-0.5">{item.caption}</Text>
                  </LinearGradient>
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="flex-row justify-center items-center mt-4">
            {RESULTS.map((item, i) => (
              <View
                key={item.title}
                style={{
                  width: i === activeIndex ? 22 : 8,
                  height: 8,
                  borderRadius: 4,
                  marginHorizontal: 3,
                  backgroundColor: i === activeIndex ? "#ec4899" : "#f9a8d4",
                }}
              />
            ))}
          </View>
        </View>

        {/* ── App benefits ── */}
        <View className="px-6 mt-10">
          <Text className="text-gray-800 text-2xl font-bold">Why Book With Our App</Text>
          <Text className="text-gray-500 text-sm mt-1 mb-4">
            Skip the waiting and plan your visit your way
          </Text>

          {BENEFITS.map((benefit) => (
            <View
              key={benefit.title}
              className="flex-row items-center bg-white rounded-2xl p-4 mb-3"
              style={{
                shadowColor: "#ec4899",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="w-12 h-12 rounded-full bg-pink-100 items-center justify-center mr-4">
                <Ionicons name={benefit.icon} size={24} color="#ec4899" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-800 font-bold text-base">{benefit.title}</Text>
                <Text className="text-gray-500 text-sm mt-0.5 leading-5">{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Sticky call-to-action ── */}
      <View
        className="absolute left-0 right-0 bottom-0 bg-white px-6 pt-4 border-t border-pink-100"
        style={{
          paddingBottom: insets.bottom + 12,
          shadowColor: "#ec4899",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        <TouchableOpacity onPress={onGetStarted} activeOpacity={0.85} className="rounded-xl overflow-hidden">
          <LinearGradient
            colors={["#ec4899", "#f472b6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 16, alignItems: "center" }}
          >
            <Text className="text-white text-lg font-bold">Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={onCreateAccount} className="items-center mt-3">
          <Text className="text-gray-600 text-sm">
            New here? <Text className="text-pink-500 font-bold">Create an account</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}