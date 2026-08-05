#!/usr/bin/env node
// 邀请码管理：node server/cli.js invite new -n 20 --uses 1 --note "第一批"
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createInvite, listInvites, setInviteDisabled, countUsers } from './db.js'

const argv = process.argv.slice(2)
const cmd = `${argv[0] || ''} ${argv[1] || ''}`.trim()

function flag(name, fallback) {
  const i = argv.findIndex((a) => a === `--${name}` || a === `-${name[0]}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

// 去掉易混淆的 0/O/1/I/L
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const gen = (len = 8) =>
  Array.from(crypto.randomBytes(len), (b) => ALPHABET[b % ALPHABET.length]).join('')

switch (cmd) {
  case 'invite new': {
    const count = Number(flag('n', flag('count', 1)))
    const uses = Number(flag('uses', 1))
    const note = flag('note', null)
    for (let i = 0; i < count; i++) {
      const inv = createInvite({ code: gen(), maxUses: uses, note })
      console.log(inv.code)
    }
    console.error(`\n已生成 ${count} 个邀请码，每个可用 ${uses} 次。`)
    break
  }

  case 'invite import': {
    // 把一批已经生成好的码灌进当前库（本地先出码分发，上线后导入生产库）
    const file = argv[2]
    if (!file) { console.error('用法: node server/cli.js invite import <文件>'); process.exit(1) }
    const uses = Number(flag('uses', 1))
    const note = flag('note', null)

    const codes = fs.readFileSync(file, 'utf8')
      .split('\n')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s && !s.startsWith('#'))

    let added = 0
    let skipped = 0
    for (const code of codes) {
      try {
        createInvite({ code, maxUses: uses, note })
        added++
      } catch (e) {
        // 已经导入过就跳过，重复执行不会出错
        if (/UNIQUE/i.test(String(e.message))) skipped++
        else throw e
      }
    }
    console.log(`导入 ${added} 个，跳过 ${skipped} 个已存在的。`)
    break
  }

  case 'invite list': {
    const rows = listInvites()
    if (!rows.length) { console.log('（还没有邀请码）'); break }
    console.log('CODE       USED/MAX  STATUS    NOTE')
    for (const r of rows) {
      const status = r.disabled ? 'disabled' : r.used_count >= r.max_uses ? 'used-up' : 'active'
      console.log(`${r.code.padEnd(10)} ${String(r.used_count + '/' + r.max_uses).padEnd(9)} ${status.padEnd(9)} ${r.note || ''}`)
    }
    break
  }

  case 'invite disable':
  case 'invite enable': {
    const code = argv[2]
    if (!code) { console.error('用法: node server/cli.js invite disable <CODE>'); process.exit(1) }
    const n = setInviteDisabled(code, cmd.endsWith('disable'))
    console.log(n ? `${code} 已${cmd.endsWith('disable') ? '停用' : '启用'}` : `找不到 ${code}`)
    break
  }

  case 'stats': {
    console.log(`注册用户：${countUsers()}`)
    console.log(`邀请码：${listInvites().length}`)
    break
  }

  default:
    console.log(`用法:
  node server/cli.js invite new [-n 数量] [--uses 每码可用次数] [--note 备注]
  node server/cli.js invite import <文件> [--uses N] [--note 备注]
  node server/cli.js invite list
  node server/cli.js invite disable <CODE>
  node server/cli.js invite enable  <CODE>
  node server/cli.js stats`)
}
