import { describe, expect, it } from 'vitest'
import { jsonToQuestions, parseCsv, questionsToRows, rowsToQuestions, toCsv } from './bankio'

describe('parseCsv', () => {
  it('handles quotes, embedded delimiters/newlines and BOM', () => {
    const t = parseCsv('﻿text,option1\r\n"Hoe, gaat het?","a ""b""\nc"\r\n')
    expect(t).toEqual([['text', 'option1'], ['Hoe, gaat het?', 'a "b"\nc']])
  })
  it('detects the semicolon delimiter (Dutch Excel)', () => {
    expect(parseCsv('vraag;optie1\nX;Y')[1]).toEqual(['X', 'Y'])
  })
})

describe('rowsToQuestions', () => {
  const csv = `vraag;optie1;optie2;optie3;juist;categorie;moeilijkheid;tags;punten
Hoofdstad van Australië?;Sydney;Canberra;Perth;2;Aardrijkskunde;makkelijk;land|stad;7,5
Priemgetallen?;2;3;4;1|2;Wiskunde;;;
Kapot;a;b;;9;;;;`
  const r = rowsToQuestions(parseCsv(csv))
  it('maps Dutch headers, 1-based correct, fractional points', () => {
    expect(r.items[0]).toMatchObject({ text: 'Hoofdstad van Australië?', type: 'MC', correct: ['b'], category: 'Aardrijkskunde', difficulty: 1, points: 7.5 })
  })
  it('infers MULTI from several correct answers', () => {
    expect(r.items[1].type).toBe('MULTI')
    expect(r.items[1].correct).toEqual(['a', 'b'])
  })
  it('reports row-level errors without dropping valid rows', () => {
    expect(r.items).toHaveLength(2)
    expect(r.errors).toEqual([{ row: 4, message: 'a "correct" value matches no option' }])
  })
  it('matches correct by option text', () => {
    const x = rowsToQuestions(parseCsv('text,option1,option2,correct\nQ,Ja,Nee,nee'))
    expect(x.items[0].correct).toEqual(['b'])
  })
  it('requires a text column', () => {
    expect(rowsToQuestions([['foo']]).errors[0].message).toMatch(/text/)
  })
})

describe('jsonToQuestions + round trip', () => {
  it('accepts string options and index/text answers', () => {
    const r = jsonToQuestions({ questions: [{ text: 'Q', options: ['a', 'b', 'c'], correct: 3 }, { text: 'R', type: 'MULTI', options: [{ id: 'x', text: '1' }, { id: 'y', text: '2' }], correct: ['x', 'y'] }] })
    expect(r.errors).toEqual([])
    expect(r.items[0].correct).toEqual(['c'])
    expect(r.items[1].correct).toEqual(['x', 'y'])
  })
  it('CSV export re-imports to the same questions', () => {
    const first = rowsToQuestions(parseCsv('text,option1,option2,option3,correct,tags\n"Hé, wat?",A,B,C,"1;3",x;y')).items
    const again = rowsToQuestions(parseCsv(toCsv(questionsToRows(first)))).items
    expect(again).toEqual(first.map((q) => ({ ...q })))
  })
})

describe('open questions in the bank', () => {
  it('imports OPEN rows with accepted answers and round-trips via CSV', () => {
    const r = rowsToQuestions(parseCsv('vraag;type;juist;categorie\nHoofdstad van Frankrijk?;OPEN;Parijs|Paris;Aardrijkskunde'))
    expect(r.errors).toEqual([])
    expect(r.items[0]).toMatchObject({ type: 'OPEN', options: [], correct: ['Parijs', 'Paris'] })
    const again = rowsToQuestions(parseCsv(toCsv(questionsToRows(r.items)))).items
    expect(again[0]).toMatchObject({ type: 'OPEN', correct: ['Parijs', 'Paris'] })
  })
  it('rejects OPEN without accepted answers; accepts OPEN in JSON', () => {
    expect(rowsToQuestions(parseCsv('vraag;type;juist\nX;OPEN;')).errors).toHaveLength(1)
    expect(jsonToQuestions([{ text: 'X?', type: 'OPEN', correct: ['a'] }]).items[0].type).toBe('OPEN')
  })
})
