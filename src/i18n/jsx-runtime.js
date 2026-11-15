import { jsx as _jsx, jsxs as _jsxs, Fragment } from 'react/jsx-runtime'
import { patchProps } from './patch'
export { Fragment }
export const jsx = (type, props, key) => _jsx(type, patchProps(type, props), key)
export const jsxs = (type, props, key) => _jsxs(type, patchProps(type, props), key)
