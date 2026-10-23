# Implementation Plan: To-do List Life Dashboard

## Overview

Implement a zero-dependency, single-page productivity dashboard in three files (`index.html`, `css/style.css`, `js/app.js`). Each task builds incrementally on the previous, wiring all four widgets together at the end. Testing uses Vitest with fast-check for property-based tests and jsdom for DOM testing.

## Tasks

- [x] 1. Scaffold project structure and set up testing framework
  - Create `index.html` with semantic HTML structure: four widget containers (`#greeting-widget`, `#timer-widget`, `#todo-widget`, `#links-widget`), a `<link>` to `css/style.css`, and a `<script>` tag loading `js/app.js`
  - Create `css/style.css` with a base font size of at least 14px and color contrast ratios meeting WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text)
  - Create `js/app.js` with the module-level `state` object (`tasks`, `links`, `timer`) and the `init()` bootstrap function wired to `DOMContentLoaded`
  - Initialize a `package.json` and install Vitest, fast-check, and jsdom as dev dependencies; configure Vitest to use the jsdom environment
  - Create a `tests/` directory with a placeholder test file to confirm the test runner works
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2. Implement storage utilities
  - [x] 2.1 Implement `storageAvailable()`, `saveToStorage(key, value)`, and `loadFromStorage(key)` in `js/app.js`
    - `storageAvailable()` uses a try/catch probe and returns a boolean
    - `saveToStorage` wraps `localStorage.setItem` in try/catch; on quota error, dispatches an error notification
    - `loadFromStorage` wraps `JSON.parse` in try/catch; on parse failure, removes the corrupted key and returns `null`
    - If `localStorage` is unavailable, all save calls are no-ops and all load calls return `null`
    - Implement `sanitizeText(str)` — trims input and enforces a maximum-length guard
    - _Requirements: 4.3, 4.4, 4.5, 6.4, 6.5, 7.2, 7.5_

- [x] 3. Implement Greeting Widget
  - [x] 3.1 Implement `getGreeting(hour)`, `tickClock()`, and `initClock()` in `js/app.js`
    - `getGreeting(hour)` returns "Good Morning" (05–11), "Good Afternoon" (12–17), "Good Evening" (18–20), or "Good Night" (21–23 and 00–04)
    - `tickClock()` reads `new Date()`, formats the time as HH:MM:SS and the date as "Weekday, Month DD, YYYY" using full English names, and updates only the DOM nodes inside `#greeting-widget`
    - `initClock()` calls `tickClock()` immediately then starts a 1-second `setInterval`; if the interval ever stalls, the last rendered value is preserved
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 4. Implement Focus Timer Widget
  - [x] 4.1 Implement `initTimer()`, `startTimer()`, `stopTimer()`, `resetTimer()`, and `tickTimer()` in `js/app.js`
    - `initTimer()` renders the timer display showing `25:00` and wires the `#timer-start-stop` and `#timer-reset` buttons
    - `startTimer()` starts a 1-second interval calling `tickTimer()`; ignores the call if `state.timer.running` is already `true`
    - `stopTimer()` clears the interval and sets `state.timer.running` to `false`; preserves `state.timer.remaining`
    - `resetTimer()` calls `stopTimer()`, sets `remaining` to 1500, sets `expired` to `false`, and re-renders the timer display
    - `tickTimer()` decrements `remaining` by 1; when `remaining` reaches 0, sets `expired` to `true`, stops the interval, and shows a visible alert indicator in `#timer-widget`
    - Timer state is NOT persisted to localStorage
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 5. Checkpoint — Ensure all tests pass
  - Run `npx vitest --run` and confirm all implemented tests pass; ask the user if any questions arise.

- [x] 6. Implement Todo List Widget
  - [x] 6.1 Implement `addTask(description)`, `editTask(id, newDescription)`, `toggleTask(id)`, `deleteTask(id)`, `renderTasks()`, and `hydrateTasks()` in `js/app.js`
    - Validate description: trimmed length must be ≥ 1 and ≤ 500; rejection shows inline error adjacent to `#task-input` and retains focus
    - `addTask` generates a UUID (`crypto.randomUUID` with `Date.now()` fallback), pushes the new Task to `state.tasks`, calls `saveToStorage("tasks", state.tasks)`, and calls `renderTasks()`
    - `editTask` updates the matching task's description in `state.tasks`, persists, and re-renders
    - `toggleTask` flips `completed` on the matching task, persists, and re-renders
    - `deleteTask` splices the matching task from `state.tasks`, persists, and re-renders
    - `renderTasks()` replaces `#todo-widget` innerHTML; completed tasks receive strikethrough styling; tasks are listed in insertion order (sorted by `createdAt`)
    - Activating the edit control for a task replaces its text node with a pre-populated `<input>` field; Cancel restores original text; Confirm triggers validation
    - `hydrateTasks()` calls `loadFromStorage("tasks")` and populates `state.tasks`; on parse failure, shows *"Saved data could not be loaded and has been cleared."* inside `#todo-widget`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Implement Quick Links Widget
  - [x] 7.1 Implement `addLink(label, url)`, `deleteLink(id)`, `renderLinks()`, and `hydrateLinks()` in `js/app.js`
    - Validate label: trimmed length ≥ 1 and ≤ 50; validate URL: trimmed length ≥ 1 and ≤ 2048
    - If URL does not start with `http://` or `https://`, prepend `https://` before saving
    - `addLink` generates a UUID, pushes the new Link to `state.links`, calls `saveToStorage("links", state.links)`, and calls `renderLinks()`
    - `deleteLink` removes the matching link from `state.links`, persists, and re-renders
    - `renderLinks()` replaces `#links-widget` innerHTML; each link renders as a `<button>` or `<a>` that opens the saved URL in a new browser tab (`target="_blank"`)
    - `hydrateLinks()` calls `loadFromStorage("links")` and populates `state.links`; on failure, renders an empty panel with no error
    - Rejection of invalid input shows inline field-specific error messages
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Implement localStorage error handling and banners
  - [x] 8.1 Implement the `localStorage` unavailability banner and write failure notifications
    - In `init()`, call `storageAvailable()`; if `false`, render a persistent non-dismissable banner at the top of the page: *"Your browser does not support local storage. Data will not be saved."*
    - Ensure all `saveToStorage` call sites display a transient *"Changes could not be saved."* message in the affected widget on write failure
    - Ensure all error messages are accessible (associated with the relevant widget via `aria-live` or similar)
    - _Requirements: 4.4, 4.5, 6.4, 6.5, 7.5_

- [x] 9. Apply CSS styling and visual hierarchy
  - [x] 9.1 Style all four widgets in `css/style.css`
    - Apply visual hierarchy: widget titles use a font size at least 2px larger than body text, or heavier font weight, or clear spatial separation via margin/padding
    - Base font size ≥ 14px; verify contrast ratios meet WCAG 2.1 AA (4.5:1 normal, 3:1 large text)
    - Style completed tasks with `text-decoration: line-through` in `#todo-widget`
    - Style the timer expired indicator as a clearly visible alert (e.g., color change, border, or icon)
    - Ensure interactive controls (buttons, inputs) are visually distinct and keyboard-focusable with visible focus rings
    - _Requirements: 3.7, 2.6, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10. Wire everything together in `init()` and final integration
  - [x] 10.1 Complete the `init()` bootstrap function
    - Call `storageAvailable()` first; set up the unavailability banner if needed
    - Call `hydrateTasks()` and `hydrateLinks()`
    - Call `renderTasks()`, `renderLinks()`, `initTimer()`, and `initClock()`
    - Ensure the full dashboard renders within 500ms of `DOMContentLoaded`
    - _Requirements: 4.2, 7.1, 7.2, 7.3, 7.4, 8.1_

- [x] 11. Final checkpoint — Ensure all tests pass
  - Run `npx vitest --run` and confirm all tests pass; verify `index.html` opens in a browser with all four widgets visible and functional; ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical breaks
- Property tests validate universal correctness properties (Properties 1–8 from the design document)
- Unit tests validate specific examples and edge cases
- Timer state is intentionally not persisted to localStorage — it always resets to 25:00 on page load
- The `crypto.randomUUID` API is available in all target browsers; `Date.now()` is provided as a fallback for older environments

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "3.1", "4.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "4.2", "4.3", "6.1", "7.1"] },
    { "id": 3, "tasks": ["6.2", "6.3", "6.4", "6.5", "7.2", "7.3", "7.4", "8.1"] },
    { "id": 4, "tasks": ["8.2", "9.1"] },
    { "id": 5, "tasks": ["10.1"] },
    { "id": 6, "tasks": ["10.2"] }
  ]
}
```
