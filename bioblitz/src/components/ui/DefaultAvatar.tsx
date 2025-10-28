import React from 'react';

interface DefaultAvatarProps {
  name: string;
}

const DefaultAvatar: React.FC<DefaultAvatarProps> = ({ name }) => {
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const getBackgroundColor = (name: string) => {
    if (!name) return '#000000';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - color.length) + color;
  };

  const initials = getInitials(name);
  const backgroundColor = getBackgroundColor(name);

  return (
    <div
      style={{
        backgroundColor,
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '20px',
        fontWeight: 'bold',
      }}
    >
      {initials}
    </div>
  );
};

export default DefaultAvatar;
