// jest-dom adds custom matchers for asserting on DOM nodes, e.g.
// expect(element).toHaveTextContent(/react/i)
// https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// The jsdom build shipped with react-scripts 5 predates TextEncoder and
// TextDecoder being global in browsers. React Router 7 expects both, and fails
// to load without them.
if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = TextDecoder;
}
