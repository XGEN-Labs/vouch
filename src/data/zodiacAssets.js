import aries from '../assets/zodiac/aries.png'
import taurus from '../assets/zodiac/taurus.png'
import gemini from '../assets/zodiac/gemini.png'
import cancer from '../assets/zodiac/cancer.png'
import leo from '../assets/zodiac/leo.png'
import virgo from '../assets/zodiac/virgo.png'
import libra from '../assets/zodiac/libra.png'
import scorpio from '../assets/zodiac/scorpio.png'
import sagittarius from '../assets/zodiac/sagittarius.png'
import capricorn from '../assets/zodiac/capricorn.png'
import aquarius from '../assets/zodiac/aquarius.png'
import pisces from '../assets/zodiac/pisces.png'

import ariesSpirit from '../assets/zodiac/aries-spirit.png'
import taurusSpirit from '../assets/zodiac/taurus-spirit.png'
import geminiSpirit from '../assets/zodiac/gemini-spirit.png'
import cancerSpirit from '../assets/zodiac/cancer-spirit.png'
import leoSpirit from '../assets/zodiac/leo-spirit.png'
import virgoSpirit from '../assets/zodiac/virgo-spirit.png'
import libraSpirit from '../assets/zodiac/libra-spirit.png'
import scorpioSpirit from '../assets/zodiac/scorpio-spirit.png'
import sagittariusSpirit from '../assets/zodiac/sagittarius-spirit.png'
import capricornSpirit from '../assets/zodiac/capricorn-spirit.png'
import aquariusSpirit from '../assets/zodiac/aquarius-spirit.png'
import piscesSpirit from '../assets/zodiac/pisces-spirit.png'

import ariesClosed from '../assets/zodiac/aries-spirit-closed.png'
import taurusClosed from '../assets/zodiac/taurus-spirit-closed.png'
import geminiClosed from '../assets/zodiac/gemini-spirit-closed.png'
import cancerClosed from '../assets/zodiac/cancer-spirit-closed.png'
import leoClosed from '../assets/zodiac/leo-spirit-closed.png'
import virgoClosed from '../assets/zodiac/virgo-spirit-closed.png'
import libraClosed from '../assets/zodiac/libra-spirit-closed.png'
import scorpioClosed from '../assets/zodiac/scorpio-spirit-closed.png'
import sagittariusClosed from '../assets/zodiac/sagittarius-spirit-closed.png'
import capricornClosed from '../assets/zodiac/capricorn-spirit-closed.png'
import aquariusClosed from '../assets/zodiac/aquarius-spirit-closed.png'
import piscesClosed from '../assets/zodiac/pisces-spirit-closed.png'

import ariesSign from '../assets/zodiac/aries-sign.png'
import taurusSign from '../assets/zodiac/taurus-sign.png'
import geminiSign from '../assets/zodiac/gemini-sign.png'
import cancerSign from '../assets/zodiac/cancer-sign.png'
import leoSign from '../assets/zodiac/leo-sign.png'
import virgoSign from '../assets/zodiac/virgo-sign.png'
import libraSign from '../assets/zodiac/libra-sign.png'
import scorpioSign from '../assets/zodiac/scorpio-sign.png'
import sagittariusSign from '../assets/zodiac/sagittarius-sign.png'
import capricornSign from '../assets/zodiac/capricorn-sign.png'
import aquariusSign from '../assets/zodiac/aquarius-sign.png'
import piscesSign from '../assets/zodiac/pisces-sign.png'

/** 完整格 */
export const ZODIAC = {
  aries, taurus, gemini, cancer, leo, virgo,
  libra, scorpio, sagittarius, capricorn, aquarius, pisces,
}

/** 睁眼守护灵 */
export const SPIRIT = {
  aries: ariesSpirit, taurus: taurusSpirit, gemini: geminiSpirit, cancer: cancerSpirit,
  leo: leoSpirit, virgo: virgoSpirit, libra: libraSpirit, scorpio: scorpioSpirit,
  sagittarius: sagittariusSpirit, capricorn: capricornSpirit,
  aquarius: aquariusSpirit, pisces: piscesSpirit,
}

/** 闭眼守护灵（未现身） */
export const SPIRIT_CLOSED = {
  aries: ariesClosed, taurus: taurusClosed, gemini: geminiClosed, cancer: cancerClosed,
  leo: leoClosed, virgo: virgoClosed, libra: libraClosed, scorpio: scorpioClosed,
  sagittarius: sagittariusClosed, capricorn: capricornClosed,
  aquarius: aquariusClosed, pisces: piscesClosed,
}

export const SIGN_GLYPH = {
  aries: ariesSign, taurus: taurusSign, gemini: geminiSign, cancer: cancerSign,
  leo: leoSign, virgo: virgoSign, libra: libraSign, scorpio: scorpioSign,
  sagittarius: sagittariusSign, capricorn: capricornSign,
  aquarius: aquariusSign, pisces: piscesSign,
}

export function zodiacSrc(signId) {
  return ZODIAC[signId] || leo
}

export function spiritSrc(signId) {
  return SPIRIT[signId] || leoSpirit
}

export function spiritClosedSrc(signId) {
  return SPIRIT_CLOSED[signId] || leoClosed
}

export function creatureSrc(signId) {
  return spiritSrc(signId)
}

export function signSrc(signId) {
  return SIGN_GLYPH[signId] || leoSign
}
