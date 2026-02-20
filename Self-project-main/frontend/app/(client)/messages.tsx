import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { chatService, Conversation } from '../../services/chat';
import { useAuth } from '../../contexts/AuthContext';
import { VerificationStatus } from '../../types';

export default function StudentMessages() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Check verification status
  const isVerified = user?.profile?.verification_status === VerificationStatus.VERIFIED;
  
  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: chatService.getConversations,
    enabled: isVerified, // Only fetch if verified
  });

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find(p => p.id !== user?.id) || conv.participants[0];
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const other = getOtherParticipant(item);
    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => router.push({ pathname: '/(client)/chat/[id]', params: { id: item.id, name: other.name } })}
      >
        <View style={styles.avatar}>
          <MaterialCommunityIcons name={other.role === 'service_provider' ? 'store' : 'account'} size={28} color="#2563EB" />
        </View>
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.participantName} numberOfLines={1}>{other.name}</Text>
            <Text style={styles.time}>{formatTime(item.last_message_time)}</Text>
          </View>
          <View style={styles.conversationFooter}>
            <Text style={styles.lastMessage} numberOfLines={1}>{item.last_message || 'No messages yet'}</Text>
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>In-app communication only</Text>
      </View>
      
      {/* Show verification required if not verified */}
      {!isVerified ? (
        <View style={styles.verificationRequired}>
          <MaterialCommunityIcons name="shield-alert" size={64} color="#F59E0B" />
          <Text style={styles.verificationTitle}>Verification Required</Text>
          <Text style={styles.verificationText}>
            Your account must be verified before you can access messages. Please upload your verification documents in your profile.
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color="#2563EB" /></View>
      ) : conversations && conversations.length > 0 ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="message-text-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation from a service or contract page</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: '700', color: '#1F2937' },
  subtitle: { fontSize: 12, color: '#10B981', marginTop: 4 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  verificationRequired: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#FEF3C7' },
  verificationTitle: { fontSize: 20, fontWeight: '700', color: '#92400E', marginTop: 16 },
  verificationText: { fontSize: 14, color: '#92400E', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  list: { padding: 16 },
  conversationCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  conversationInfo: { flex: 1 },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  participantName: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 },
  time: { fontSize: 12, color: '#9CA3AF' },
  conversationFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#6B7280', flex: 1 },
  unreadBadge: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
});
