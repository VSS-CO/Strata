; Strata Compiler - x86-64 Assembly (Windows)
; Generated code

default rel
global main
extern printf
extern ExitProcess

section .text

_print_int:
    push rbp
    mov rbp, rsp
    sub rsp, 32
    mov rdx, rcx
    lea rcx, [fmt_int]
    call printf
    mov rsp, rbp
    pop rbp
    ret

_print_float:
    push rbp
    mov rbp, rsp
    sub rsp, 32
    movsd xmm1, xmm0
    lea rcx, [fmt_float]
    call printf
    mov rsp, rbp
    pop rbp
    ret

_print_str:
    push rbp
    mov rbp, rsp
    sub rsp, 32
    mov rdx, rcx
    lea rcx, [fmt_str]
    call printf
    mov rsp, rbp
    pop rbp
    ret

_print_bool:
    push rbp
    mov rbp, rsp
    sub rsp, 32
    test ecx, ecx
    lea rdx, [str_true]
    lea rax, [str_false]
    cmovz rdx, rax
    lea rcx, [fmt_str]
    call printf
    mov rsp, rbp
    pop rbp
    ret

main:
    push rbp
    mov rbp, rsp
    sub rsp, 256
    lea rax, [.LC0]
    mov rcx, rax
    call _print_str
    xor eax, eax
    xor ecx, ecx
    call ExitProcess

section .data
    fmt_int: db "%lld", 10, 0
    fmt_float: db "%g", 10, 0
    fmt_str: db "%s", 10, 0
    str_true: db "true", 0
    str_false: db "false", 0
    .LC0: db 72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33, 0

section .bss
