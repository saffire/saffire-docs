# Strings

We try to have binary safe strings. This way, we can treat the contents of binary files as strings, but this has issues when dealing with C's string representation, which is nothing more than a consequtive buffer of chars, terminated by a `\0` (thus not binary safe).

Saffire defines internally a `t_string`, which holds a value (a `char *`), a length, and a unicode representation of the value which could be `NULL`.

We don't convert everything automatically to unicode/UTF8, but only when we really need to. This means that memory usage of a string could double (even triple, depending on the size of `UChar`). A solution could be that the string functionality would remove the original string, only and always use `UChar()` and setup custom string functionality (we could not use strcmp() etc anymore).

For now, we keep unicode representation and the actual string seperate.

Since we now have different ways of using strings, (zero-terminated strings, called char0, and t_strings), we must have a way to convert them. Example:

  t_string *str = char0_to_string("hello world");
 
 Since we cannot directly use a string, we must convert this to a t_string. We have different support methods for this:
 
    t_string *char0_to_string(const char *s);
    t_string *char_to_string(const char *s, size_t len);
    char *string_to_char(const t_string *s);
    t_string *string_new(void);
    void string_free(t_string *str);
    
Also, we have some supporting methods:

    int string_strcmp(t_string *s1, t_string *s2);
    int string_strcmp0(t_string *s1, const char *c_str);

    char *string_strdup0(const char *s);
    t_string *string_strdup(t_string *s);

    t_string *string_strcat0(t_string *dst, const char *src);
    t_string *string_strcat(t_string *dst, const t_string *src);

    t_string *string_copy_partial(t_string *src, int offset, int count);

It's very possible that we mix char0 and strings internally in the Saffire core (but from userland perspective everything is a string object that holds a t_string internally!). This is why we have we have a strcmp function for two strings, and a string and a char0 as well.


This also mean we have different versions of for example, `smm_asprintf_char` and `smm_asprintf_string` where the first one is simply `asprintf()`, and the second one uses and returns `t_strings`.

Note that even though strings are binary safe, using them in a non-binary safe method, like printing them on string, will result in issues.

There is a custom `arg_printf_string` function that allows you to use t_strings within the "%s" instead of char0.
 