/**
 * 用 js 对象表示 dom
 * @param {*} type 类型
 * @param {*} props 属性
 * @param  {...any} children 子节点
 * 转换成virtual dom
 */
function transformVirtualObj(type, props, ...children) {
    return {
        type,
        props,
        children,
    };
}

/**
 * 节点是否发生改变
 * @param {*} node1 
 * @param {*} node2 
 */
function isNodeChanged(node1, node2) {
    if (node1.type !== undefined && node2.type !== undefined) {
        return node1.type !== node2.type;
    }
    return node1 !== node2;
}

function isEventProp(name) {
    return /^on/.test(name);
}

function extractEventName(name) {
    return name.slice(2).toLowerCase();
}

function isCustomData(name) {
    return /^data/g.test(name);
}

function isCustom(name) {
    return isEventProp(name) || name === 'forceUpdate';
}

function addEventListener($target, name, value) {
    if (isEventProp(name)) {
        $target[`${name.toLowerCase()}`] = value;
    }
}

function removeEventListener($target, name) {
    if (isEventProp(name)) {
        $target[`${name.toLowerCase()}`] = null;
    }
}

function setBooleanProp($target, name, value) {
    if (value) {
        $target.setAttribute(name, true);
        $target[name] = true;
    } else {
        $target[name] = false;
    }
}

/**
 * 转换为类似于data-index、data-user-name
 * @param {*} name 
 */
function transformToCustomData(name) {
    const upCasePos = [...name.matchAll(/[A-Z]/g)].map(u => u.index);
    let customName = '';
    upCasePos.forEach((u, i) => {
        if (i === 0) {
            customName += name.slice(0, u).toLowerCase();
        }
        if (i !== 0 && i !== upCasePos.length) {
            customName += `-${name.slice(upCasePos[i - 1], u).toLowerCase()}`;
        }
        if (i === upCasePos.length - 1) {
            customName += `-${name.slice(u).toLowerCase()}`;
        }
    });
    return customName;
}

function setProp($target, name, value) {
    if (isCustom(name)) {
        addEventListener($target, name, value);
    } else if (isCustomData(name)) {
        $target.setAttribute(transformToCustomData(name), value);
    } else if (name === 'className') {
        $target.setAttribute('class', value);
    } else if (typeof value === 'boolean') {
        setBooleanProp($target, name, value);
    } else {
        $target.setAttribute(name, value);
    }
}

function setProps($target, props) {
    Object.keys(props).forEach(name => {
        setProp($target, name, props[name]);
    });
}

function removeBooleanProp($target, name) {
    $target.removeAttribute(name);
}

function removeProp($target, name, value) {
    if (isCustom(name)) {
        removeEventListener($target, name);
    } else if (isCustomData(name)) {
        $target.removeAttribute(transformToCustomData(name));
    } else if (name === 'className') {
        $target.removeAttribute('class');
    } else if (typeof value === 'boolean') {
        removeBooleanProp($target, name);
    } else {
        $target.removeAttribute(name);
    }
}

function updateProp($target, name, oldVal, newVal) {
    if (!newVal) {
        removeProp($target, name, oldVal);
    } else if (!oldVal || newVal !== oldVal) {
        setProp($target, name, newVal);
    }
}

function updateProps($target, oldProps = {}, newProps = {}) {
    const oldPropsKeys = Object.keys(oldProps);
    const newPropsKeys = Object.keys(newProps);
    const allKeys = new Set([...oldPropsKeys, ...newPropsKeys]);
    allKeys.forEach(prop => {
        updateProp($target, prop, oldProps[prop], newProps[prop]);
    });
}

/**
 * 将虚拟dom转换成真实dom
 * @param {*} node 
 */
function createElement(node) {
    if (!node) {
        return;
    }

    if (typeof node === 'string') {
        return document.createTextNode(node);
    }
    // const $el = document.createElement(node.type);
    // node.children.forEach(child => {
    //     $el.appendChild(createElement(child));
    // });
    // return $el;
    
    const $el = document.createElement(node.type);
    setProps($el, node.props);
    node.children
        .map(createElement)
        .forEach($el.appendChild.bind($el));
    return $el;
}

/**
 * 两棵 virtual dom tree 之间变化关系管理
 * @param {*} $parent 挂载的父节点
 * @param {*} oldNode 旧节点
 * @param {*} newNode 新节点
 * @param {*} index 父节点中当前节点的索引，便于用新创建的节点替换它
 */
function updateElement($parent, oldNode, newNode, index = 0) {
    let $currentNode = $parent.childNodes[index];

    // 旧节点不存在，直接append新节点
    if (!oldNode) {
        return $parent.appendChild(createElement(newNode));
    }

    // 新节点不存在，直接删除旧节点
    if (!newNode) {
        return $parent.removeChild($currentNode);
    }

    // 新旧节点的type不一致，用新节点直接替换旧节点
    if (isNodeChanged(oldNode, newNode)) {
        return $parent.replaceChild(createElement(newNode), $currentNode);
    }

    // 如果都是字符串的话就不用对比了
    if (oldNode === newNode) {
        return false;
    }

    // props不一样，对比props，扩展新旧节点的props，聚合成新props，重新设置节点的props
    if (newNode.type) {
        updateProps($currentNode, oldNode.props, newNode.props);
    }

    // children 不一样，逐个对比新旧节点的对应子节点
    if ((oldNode.children && oldNode.children.length) 
        || (newNode.children && newNode.children.length)) {
        const maxLength = Math.max(oldNode.children.length, newNode.children.length);
        for (let i = 0; i < maxLength; i++) {
            updateElement($currentNode, oldNode.children[i], newNode.children[i], i);
        }
    }
}

const root = document.getElementById('root');

function handler() {
    console.log(123)
}

const prev = null;
const current = transformVirtualObj(
    'ul', 
    { className: 'list', dataSelected: true, dataIndex: 'bb', style: 'color: yellowgreen', onClick: handler },
    transformVirtualObj('li', {}, 'item 1'),
    transformVirtualObj('li', {}, 'item 2'),
);
const nodeChanged = transformVirtualObj('ul', { className: 'list', dataSelected: true, dataIndexObj: 'bb', style: 'color: orange' },
    transformVirtualObj('li', {}, 'item 1'),
    transformVirtualObj('li', {}, 'item 2'),
    transformVirtualObj('li', {}, 'item 3'),
);
updateElement(root, prev, current);

setTimeout(() => {
    updateElement(root, current, nodeChanged);
}, 5000);