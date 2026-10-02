import type { Session } from '@supabase/supabase-js';
import { View } from 'react-native';
import { Avatar } from 'react-native-paper';

export function ProfileAvatar({ session }: { session: Session }) {
  const label = `Signed in as ${session.user.email ?? 'Prayer Bank user'}`;
  const avatarUri = getProfileAvatarUri(session);

  return (
    <View accessible accessibilityLabel={label} className="h-12 w-12 items-center justify-center">
      {avatarUri ? (
        <Avatar.Image size={44} source={{ uri: avatarUri }} />
      ) : (
        <Avatar.Text
          className="bg-[#6f7653]"
          color="#fffaf0"
          label={getProfileInitials(session)}
          size={44}
        />
      )}
    </View>
  );
}

function getProfileAvatarUri(session: Session) {
  const candidate = session.user.user_metadata.avatar_url ?? session.user.user_metadata.picture;
  if (typeof candidate !== 'string') return undefined;

  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function getProfileInitials(session: Session) {
  const metadata = session.user.user_metadata;
  const displayName =
    typeof metadata.full_name === 'string'
      ? metadata.full_name
      : typeof metadata.name === 'string'
        ? metadata.name
        : session.user.email ?? 'Prayer Bank';
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PB';
}
