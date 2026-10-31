#define _POSIX_C_SOURCE 200809L
#include <lean/lean.h>
#include <stdio.h>
#include <stdlib.h>

extern void lean_initialize_runtime_module(void);
extern lean_object * runtime_initialize_Lean_WasmSpike(uint8_t builtin);
extern lean_object * ehr_step(lean_object * input);

int main(void) {
    lean_initialize_runtime_module();
    lean_object * result = runtime_initialize_Lean_WasmSpike(1);
    if (lean_io_result_is_error(result)) { lean_dec(result); return 1; }
    lean_dec(result);
    lean_io_mark_end_initialization();
    char * line = NULL;
    size_t capacity = 0;
    ssize_t length;
    while ((length = getline(&line, &capacity, stdin)) >= 0) {
        if (length > 0 && line[length - 1] == '\n') line[--length] = '\0';
        lean_object * output = ehr_step(lean_mk_string(line));
        puts(lean_string_cstr(output));
        lean_dec(output);
    }
    free(line);
    return ferror(stdin) ? 1 : 0;
}
