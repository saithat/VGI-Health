#include <lean/lean.h>
#include <cstdlib>
#include <cstring>
#include <malloc.h>

extern "C" {
void lean_initialize_runtime_module();
lean_object * EHR_MODULE_INIT(uint8_t builtin);
lean_object * ehr_step(lean_object * input);

int ehr_initialize() {
    static bool initialized = false;
    if (initialized) return 0;
    lean_initialize_runtime_module();
    lean_object * result = EHR_MODULE_INIT(1);
    if (lean_io_result_is_error(result)) {
        lean_dec(result);
        return 1;
    }
    lean_dec(result);
    lean_io_mark_end_initialization();
    initialized = true;
    return 0;
}

// The caller owns the returned UTF-8 buffer and must call ehr_free_string.
// Lean consumes the input object; its output object is released after copying.
char * ehr_step_string(const char * input) {
    if (ehr_initialize() != 0) return nullptr;
    lean_object * output = ehr_step(lean_mk_string(input));
    size_t bytes = lean_string_size(output);
    char * copy = static_cast<char *>(std::malloc(bytes));
    if (copy) std::memcpy(copy, lean_string_cstr(output), bytes);
    lean_dec(output);
    return copy;
}

void ehr_free_string(char * output) { std::free(output); }

// Diagnostic only: live allocated bytes, excluding free allocator capacity.
size_t ehr_heap_used() { return mallinfo().uordblks; }
}
