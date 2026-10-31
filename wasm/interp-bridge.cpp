#include <lean/lean.h>
#include <cstdlib>
#include <cstring>
#include <malloc.h>

extern "C" {
void lean_initialize_runtime_module();
// DECLARATIONS

int ehr_initialize() {
    static bool initialized = false;
    if (initialized) return 0;
    lean_initialize_runtime_module();
    lean_object * result;
// INITIALIZERS
    lean_io_mark_end_initialization();
    initialized = true;
    return 0;
}

// Lean owns its input; the caller owns the copied output until free_string.
char * ehr_call_string(const char * name, const char * input) {
    if (ehr_initialize() != 0) return nullptr;
    lean_object * (*fn)(lean_object *) = nullptr;
// DISPATCH
    if (!fn) return nullptr;
    lean_object * output = fn(lean_mk_string(input));
    size_t bytes = lean_string_size(output);
    char * copy = static_cast<char *>(std::malloc(bytes));
    if (copy) std::memcpy(copy, lean_string_cstr(output), bytes);
    lean_dec(output);
    return copy;
}
void ehr_free_string(char * output) { std::free(output); }
size_t ehr_heap_used() { return mallinfo().uordblks; }
}
