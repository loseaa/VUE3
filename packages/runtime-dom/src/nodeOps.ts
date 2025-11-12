export const nodeOps={
    createElement(tag:string){
        return document.createElement(tag)
    },
    setElementText(el:Element,text:string){
        el.textContent=text
    },
    insert(child:Node,parent:Node,anchor:Node|null=null){
        parent.insertBefore(child,anchor)
    },
    remove(node:Node){
        if(node.parentNode){
            node.parentNode.removeChild(node)
        }
    },
    createText(text:string){
        return document.createTextNode(text)
    },
    setText(node:Node,text:string){
        node.nodeValue=text 
    },
    parentNode(node:Node){
        return node.parentNode
    },
    nextSibling(node:Node){
        return node.nextSibling
    },
    


}