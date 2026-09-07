# Code Rules and Best Practices

To maintain a clean, efficient, and warning-free codebase, please adhere to the following rules based on recent code quality issues:

## 1. Avoid Exception for Local Control-Flow
**Issue:** Throwing an exception (`throw new Error(...)`) and immediately catching it in a local `catch` block within the same function or file.
**Why it's bad:** Exceptions are designed for exceptional, unpredictable conditions that propagate up the call stack. Using them for regular control flow (like handling a known "unknown tool" case or a failed clipboard copy) adds unnecessary performance overhead and makes the code harder to follow.
**Solution:** Use standard control flow statements like `if/else`, `return`, or returning an error object instead.

*Incorrect:*
```javascript
try {
  if (!success) throw new Error('Action failed');
  // ... success logic
} catch (err) {
  console.error(err);
}
```

*Correct:*
```javascript
if (!success) {
  console.error('Action failed');
  return;
}
// ... success logic
```

## 2. Clean Up Unused Symbols
**Issue:** Variables, constants, functions, parameters, or properties that are declared but never used (e.g., `unused constant isDragging`, `unused function formatDuration`).
**Why it's bad:** Unused code clutters the file, increases bundle size, and creates confusion for developers trying to understand what the code does and whether it can be safely removed.
**Solution:** Regularly check your IDE's warnings (like WebStorm inspections) and delete any unused code. If a symbol is required by an API but unused in your implementation, prefix it with an underscore (e.g., `_unusedParam`) or remove it if possible.

## 3. Avoid Redundant Variable Initializers
**Issue:** Initializing a variable with a value (like `let tag = '';`), but then completely overwriting it in every possible branch before the initial value is ever read.
**Why it's bad:** It causes confusion about the variable's lifecycle and adds unnecessary operations.
**Solution:** Only initialize a variable with a default value if there is a branch or condition where that default value will actually be used or read. Otherwise, just declare it (e.g., `let tag;`) and assign it in your branches.

## 4. Handle False Positives with Comments
**Issue:** Sometimes an IDE incorrectly flags a used property (like `strong` in `customMarkdownComponents`) as unused.
**Solution:** If a property or symbol is definitely used (e.g., dynamically or passed to a third-party library) but the IDE complains, add an inline comment to suppress the warning (e.g., `// noinspection JSUnusedGlobalSymbols`) to keep the warnings list clean and meaningful.

## 5. Avoid Code Duplication (DRY Principle)
**Issue:** Copy-pasting the same logic (like UI components, color validators, or array filtering logic) across multiple files.
**Why it's bad:** Duplicated code makes it harder to maintain the application. If a bug is found or a feature needs to change in the duplicated logic, you have to find and update every single copy.
**Solution:** Follow the "Don't Repeat Yourself" (DRY) principle. If you find yourself writing the same code twice:
- **UI Components:** Extract the JSX into a shared component (e.g., `SearchSortBar.jsx`).
- **Logic / Helpers:** Extract the logic into a shared utility function (e.g., in `utils.js` or a new `helpers` folder).
- **Hooks:** Extract stateful logic into a custom React hook.
