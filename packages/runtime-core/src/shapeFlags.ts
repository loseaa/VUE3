export const enum ShapeFlags {
    ELEMENT = 1,                   //1
    FUNCTIONAL_COMPONENT = 1 << 1, //2
    STATEFUL_COMPONENT = 1 << 2,   //4
    TEXT_CHILDREN = 1 << 3,        //8
    ARRAY_CHILDREN = 1 << 4,       //16
    SLOTS_CHILDREN = 1 << 5,       //32
    TELEPORT = 1 << 6,             //64
    SUSPENSE = 1 << 7,             //128
    KETP_ALIVE = 1 << 8,           //256
    SHOULD_KEEP_ALIVE = 1 << 9,    //512
}