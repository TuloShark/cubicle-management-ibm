// demo/api/utils/adminUtils.js
function getAdminUids() {
  return (process.env.ADMIN_UIDS || '').split(',').map(u => u.trim()).filter(Boolean);
}