// Storage helpers are shared by Career Analysis and CV Builder, so the private
// bucket rules live in one module. This file stays as the stable import path
// already used by the career routes.
export {
  downloadPrivate,
  ensurePrivateBucket,
  privateStorage,
  removePrivate,
  storageBucket,
  uploadPrivate,
} from "@/lib/storage";