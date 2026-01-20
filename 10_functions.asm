; Strata Compiler - x86-64 Assembly (Windows)
; Generated code

default rel
global main
extern printf
extern ExitProcess

section .text

_user_greet:
    push rbp
    mov rbp, rsp
    sub rsp, 128
    ; return
    lea rax, [.LC0]
    mov rsp, rbp
    pop rbp
    ret
    xor eax, eax
    mov rsp, rbp
    pop rbp
    ret

_user_add:
    push rbp
    mov rbp, rsp
    sub rsp, 128
    mov [rbp-8], rcx
    mov [rbp-16], rdx
    ; return
    mov rax, [rbp-8]
    push rax
    mov rax, [rbp-16]
    mov rcx, rax
    pop rax
    add rax, rcx
    mov rsp, rbp
    pop rbp
    ret
    xor eax, eax
    mov rsp, rbp
    pop rbp
    ret

_user_multiply:
    push rbp
    mov rbp, rsp
    sub rsp, 128
    mov [rbp-8], rcx
    mov [rbp-16], rdx
    ; return
    mov rax, [rbp-8]
    push rax
    mov rax, [rbp-16]
    mov rcx, rax
    pop rax
    imul rax, rcx
    mov rsp, rbp
    pop rbp
    ret
    xor eax, eax
    mov rsp, rbp
    pop rbp
    ret

_user_isEven:
    push rbp
    mov rbp, rsp
    sub rsp, 128
    mov [rbp-8], rcx
    ; return
    mov rax, [rbp-8]
    push rax
    mov rax, 2
    mov rcx, rax
    pop rax
    cqo
    idiv rcx
    mov rax, rdx
    push rax
    mov rax, 0
    mov rcx, rax
    pop rax
    cmp rax, rcx
    sete al
    movzx rax, al
    mov rsp, rbp
    pop rbp
    ret
    xor eax, eax
    mov rsp, rbp
    pop rbp
    ret

_user_average:
    push rbp
    mov rbp, rsp
    sub rsp, 128
    mov [rbp-8], rcx
    mov [rbp-16], rdx
    ; return
    mov rax, [rbp-8]
    push rax
    mov rax, [rbp-16]
    mov rcx, rax
    pop rax
    add rax, rcx
    push rax
    mov rax, 2
    mov rcx, rax
    pop rax
    cqo
    idiv rcx
    mov rsp, rbp
    pop rbp
    ret
    xor eax, eax
    mov rsp, rbp
    pop rbp
    ret

_user_factorial:
    push rbp
    mov rbp, rsp
    sub rsp, 128
    mov [rbp-8], rcx
    ; let result
    mov rax, 1
    mov [rbp-16], rax
    ; let i
    mov rax, 1
    mov [rbp-24], rax
.Lfor_0:
    ; for condition
    mov rax, [rbp-24]
    push rax
    mov rax, [rbp-8]
    mov rcx, rax
    pop rax
    cmp rax, rcx
    setle al
    movzx rax, al
    test rax, rax
    jz .Lendfor_2
    ; let result
    mov rax, [rbp-16]
    push rax
    mov rax, [rbp-24]
    mov rcx, rax
    pop rax
    imul rax, rcx
    mov [rbp-32], rax
.Lforupd_1:
    ; let i
    mov rax, [rbp-24]
    push rax
    mov rax, 1
    mov rcx, rax
    pop rax
    add rax, rcx
    mov [rbp-40], rax
    jmp .Lfor_0
.Lendfor_2:
    ; return
    mov rax, [rbp-16]
    mov rsp, rbp
    pop rbp
    ret
    xor eax, eax
    mov rsp, rbp
    pop rbp
    ret

_user_printNumber:
    push rbp
    mov rbp, rsp
    sub rsp, 128
    mov [rbp-8], rcx
    mov rax, [rbp-8]
    mov rcx, rax
    call _print_int
    xor eax, eax
    xor eax, eax
    mov rsp, rbp
    pop rbp
    ret

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
    lea rax, [.LC1]
    mov rcx, rax
    call _print_str
    xor eax, eax
    call _user_greet
    mov rcx, rax
    call _print_int
    xor eax, eax
    lea rax, [.LC2]
    mov rcx, rax
    call _print_str
    xor eax, eax
    ; let result
    mov rax, 10
    mov rcx, rax
    mov rax, 20
    mov rdx, rax
    call _user_add
    mov [rbp-16], rax
    mov rax, [rbp-16]
    mov rcx, rax
    call _print_int
    xor eax, eax
    lea rax, [.LC3]
    mov rcx, rax
    call _print_str
    xor eax, eax
    mov rax, 6
    mov rcx, rax
    mov rax, 7
    mov rdx, rax
    call _user_multiply
    mov rcx, rax
    call _print_int
    xor eax, eax
    lea rax, [.LC4]
    mov rcx, rax
    call _print_str
    xor eax, eax
    mov rax, 4
    mov rcx, rax
    call _user_isEven
    mov rcx, rax
    call _print_int
    xor eax, eax
    mov rax, 7
    mov rcx, rax
    call _user_isEven
    mov rcx, rax
    call _print_int
    xor eax, eax
    lea rax, [.LC5]
    mov rcx, rax
    call _print_str
    xor eax, eax
    mov rax, 4622100592565682176
    movq xmm0, rax
    mov rcx, rax
    mov rax, 4626463454704697344
    movq xmm0, rax
    mov rdx, rax
    call _user_average
    mov rcx, rax
    call _print_int
    xor eax, eax
    lea rax, [.LC6]
    mov rcx, rax
    call _print_str
    xor eax, eax
    mov rax, 5
    mov rcx, rax
    call _user_factorial
    mov rcx, rax
    call _print_int
    xor eax, eax
    lea rax, [.LC7]
    mov rcx, rax
    call _print_str
    xor eax, eax
    mov rax, 42
    mov rcx, rax
    call _user_printNumber
    xor ecx, ecx
    call ExitProcess

section .data
    fmt_int: db "%lld", 10, 0
    fmt_float: db "%g", 10, 0
    fmt_str: db "%s", 10, 0
    str_true: db "true", 0
    str_false: db "false", 0
    .LC7: db 61, 61, 61, 32, 80, 114, 105, 110, 116, 32, 118, 105, 97, 32, 70, 117, 110, 99, 116, 105, 111, 110, 32, 61, 61, 61, 0
    .LC6: db 61, 61, 61, 32, 70, 97, 99, 116, 111, 114, 105, 97, 108, 32, 61, 61, 61, 0
    .LC5: db 61, 61, 61, 32, 65, 118, 101, 114, 97, 103, 101, 32, 61, 61, 61, 0
    .LC3: db 61, 61, 61, 32, 77, 117, 108, 116, 105, 112, 108, 105, 99, 97, 116, 105, 111, 110, 32, 61, 61, 61, 0
    .LC4: db 61, 61, 61, 32, 73, 115, 32, 69, 118, 101, 110, 32, 67, 104, 101, 99, 107, 32, 61, 61, 61, 0
    .LC2: db 61, 61, 61, 32, 65, 100, 100, 105, 116, 105, 111, 110, 32, 61, 61, 61, 0
    .LC1: db 61, 61, 61, 32, 71, 114, 101, 101, 116, 105, 110, 103, 32, 61, 61, 61, 0
    .LC0: db 72, 101, 108, 108, 111, 44, 32, 83, 116, 114, 97, 116, 97, 33, 0

section .bss
