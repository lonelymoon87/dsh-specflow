# Constitution

Establish the durable engineering principles that every SpecFlow specification must follow.

Use the user's text after `/constitution` as proposed policy. Read the repository's existing instructions, architecture documentation, package manager files, test configuration, and `{{specsDir}}/../memory/constitution.md` when it exists. Do not invent rules that conflict with repository authority.

Write `{{specsDir}}/../memory/constitution.md` with these sections:

1. Project purpose and non-goals.
2. Architecture and dependency principles.
3. Security and data-handling requirements.
4. Testing and verification requirements.
5. Documentation and release requirements.
6. Amendment record.

Each principle must be observable during review. Replace vague instructions such as "write clean code" with a concrete obligation and its verification method. Preserve valid existing principles unless the user explicitly amends them. Show the resulting diff and call out any unresolved conflict.
