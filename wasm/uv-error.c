// Pure error text is the only libuv implementation retained by the Lean runtime
// in this build. Use libuv's public error table; no event loop or filesystem shim.
#include <uv.h>

const char * uv_strerror(int code) {
    switch (code) {
#define EHR_UV_ERROR(name, text) case UV_##name: return text;
        UV_ERRNO_MAP(EHR_UV_ERROR)
#undef EHR_UV_ERROR
        default: return "Unknown libuv error";
    }
}
