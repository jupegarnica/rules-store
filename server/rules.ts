
const rules = {
    onlyRead: {
        _read: ()=> true,
        _write: ()=> false,
    },
    onlyWrite: {
        _read: ()=> false,
        _write: ()=> true,
    },
    $any: {
        _read: ()=> true,
        _write: ()=> true,
    }
}

export default rules