export default function NotificationToast({ notification, onDismiss }) {
  if (!notification) return null;

  return (
    <div
      className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 ${
        notification.type === 'error'
          ? 'text-red-700'
          : notification.type === 'warning'
          ? 'text-yellow-700'
          : 'text-green-700'
      }`}
    >
      <div
        className={`flex items-center justify-between px-4 py-2 rounded-lg text-sm ${
          notification.type === 'error'
            ? 'bg-red-50 border border-red-200'
            : notification.type === 'warning'
            ? 'bg-yellow-50 border border-yellow-200'
            : 'bg-green-50 border border-green-200'
        }`}
      >
        <span>{notification.message}</span>
        <button
          onClick={onDismiss}
          className="ml-4 text-current opacity-60 hover:opacity-100"
        >
          x
        </button>
      </div>
    </div>
  );
}
