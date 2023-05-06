import type {
  ClientType,
  Facility,
  MizukiSquadType,
  OneToSix,
  PhantomSquadType,
  RolesType,
  Server,
} from './game'

export type Listen = {
  uuid: string
}

export type Unlisten = {
  uuid: string
  id: number
}

export type Poll = {
  uuid: string
  id: number
  peek?: boolean
  count?: number
}

export type Create = {
  uuid: string
  touchMode?: 'minitouch' | 'maatouch' | 'adb'
}

export type Destroy = {
  uuid: string
}

export type ConfigInstance = {
  uuid: string
} & (
  | {
      key: 2
      value: 'minitouch' | 'maatouch' | 'adb'
    }
  | {
      key: 3
      value: '0' | '1'
    }
)

export type AppendTask = {
  uuid: string
} & (
  | {
      type: 'StartUp'
      param: {
        enable?: boolean
        client_type?: ClientType
        start_game_enabled?: boolean
      }
    }
  | {
      type: 'CloseDown'
      param: {
        enable?: boolean
      }
    }
  | {
      type: 'Fight'
      param: {
        enable?: boolean
        stage?: string
        medicine?: number
        expiring_medicine?: number
        stone?: number
        drop?: {
          // TODO: 添加所有掉落物
          [key: string]: number
        }

        report_to_penguin?: boolean
        penguin_id?: string
        server?: Server
        client_type?: ClientType
        DrGrandet?: boolean
      }
    }
  | {
      type: 'Recruit'
      param: {
        enable?: boolean
        refresh?: boolean
        select: OneToSix[]
        confirm: OneToSix[]
        times?: number
        set_time?: boolean
        expedite?: boolean
        expedite_times?: number

        skip_robot?: boolean
        recruitment_time?: {
          [key in 3 | 4 | 5 | 6]?: number
        }

        report_to_penguin?: boolean
        penguin_id?: string
        report_to_yituliu?: boolean
        yituliu_id?: string
        server?: Server
      }
    }
  | {
      type: 'Infrast'
      param: {
        enable?: boolean
      } & (
        | {
            mode: 0
            facility: Facility[]
            drones?:
              | '_NotUse'
              | 'Money'
              | 'SyntheticJade'
              | 'CombatRecord'
              | 'PureGold'
              | 'OriginStone'
              | 'Chip'
            threshold?: number
            replenish?: boolean

            dorm_notstationed_enabled?: boolean
            dorm_trust_enabled?: boolean
          }
        | {
            mode: 10000
            facility: Facility[]

            threshold?: number
            replenish?: boolean

            dorm_notstationed_enabled?: boolean
            dorm_trust_enabled?: boolean
            // filename: string
            data: string
            plan_index: number
          }
      )
    }
  | {
      type: 'Mall'
      param: {
        enable?: boolean
        shopping: boolean
        buy_first?: string[]
        blacklist?: string[]
        force_shopping_if_credit_full?: boolean
      }
    }
  | {
      type: 'Award'
      param: {
        enable?: boolean
      }
    }
  | {
      type: 'Roguelike'
      param: {
        enable?: boolean
        mode?: 0 | 1 | 2 // 2 is deprecated
        starts_count?: number
        investment_enabled?: boolean
        investments_count?: number
        stop_when_investment_full?: boolean
        roles?: RolesType
        core_char?: string
        use_support?: boolean
        use_nonfriend_support?: boolean
      } & (
        | {
            theme?: 'Phantom'
            squad?: PhantomSquadType
          }
        | {
            theme: 'Mizuki'
            squad?: MizukiSquadType
          }
      )
    }
  | {
      type: 'Copilot'
      param: {
        enable?: boolean
        // filename: string
        data: string
        formation?: boolean
      }
    }
  | {
      type: 'SSSCopilot'
      param: {
        enable?: boolean
        // filename: string
        data: string
        loop_times: number
      }
    }
  | {
      type: 'Depot'
      param: {
        enable?: boolean
      }
    }
  | {
      type: 'OperBox'
      param: {
        enable?: boolean
      }
    }
  | {
      type: 'ReclamationAlgorithm'
      param: {
        enable?: boolean
        mode: 0 | 1
      }
    }
  | {
      type: 'Custom'
      param: {
        enable?: boolean
        task_names: string[]
      }
    }
  | {
      type: 'VideoRecognition'
      param: {
        enable?: boolean
        // filename: string
        data: string
      }
    }
)
// TODO: SingleStep

export type ConfigTask = {
  uuid: string
  id: number
} & (
  | {
      type: 'StartUp'
      param: {
        enable?: boolean
        client_type?: ClientType
        start_game_enabled?: boolean
      }
    }
  | {
      type: 'CloseDown'
      param: {
        enable?: boolean
      }
    }
  | {
      type: 'Fight'
      param: {
        enable?: boolean
        // stage?: string
        medicine?: number
        expiring_medicine?: number
        stone?: number
        drop?: {
          [key: string]: number
        }

        report_to_penguin?: boolean
        penguin_id?: string
        server?: Server
        client_type?: ClientType
        DrGrandet?: boolean
      }
    }
  | {
      type: 'Recruit'
      param: {
        enable?: boolean
        refresh?: boolean
        select: OneToSix[]
        confirm: OneToSix[]
        times?: number
        set_time?: boolean
        expedite?: boolean
        expedite_times?: number

        skip_robot?: boolean
        recruitment_time?: {
          [key in 3 | 4 | 5 | 6]?: number
        }

        report_to_penguin?: boolean
        penguin_id?: string
        report_to_yituliu?: boolean
        yituliu_id?: string
        server?: Server
      }
    }
  | {
      type: 'Infrast'
      param: {
        enable?: boolean
      } & (
        | {
            // mode: 0
            // facility: Facility[]
            drones?:
              | '_NotUse'
              | 'Money'
              | 'SyntheticJade'
              | 'CombatRecord'
              | 'PureGold'
              | 'OriginStone'
              | 'Chip'
            threshold?: number
            replenish?: boolean

            dorm_notstationed_enabled?: boolean
            dorm_trust_enabled?: boolean
          }
        | {
            // mode: 10000
            // facility: Facility[]

            threshold?: number
            replenish?: boolean

            dorm_notstationed_enabled?: boolean
            dorm_trust_enabled?: boolean
            // filename: string
            // data: string
            // plan_index: number
          }
      )
    }
  | {
      type: 'Mall'
      param: {
        enable?: boolean
        // shopping: boolean
        // buy_first?: string[]
        // blacklist?: string[]
        force_shopping_if_credit_full?: boolean
      }
    }
  | {
      type: 'Award'
      param: {
        enable?: boolean
      }
    }
  | {
      type: 'Roguelike'
      param: {
        enable?: boolean
        mode?: 0 | 1 | 2 // 2 is deprecated
        starts_count?: number
        investment_enabled?: boolean
        investments_count?: number
        stop_when_investment_full?: boolean
        roles?: RolesType
        core_char?: string
        use_support?: boolean
        use_nonfriend_support?: boolean
      } & (
        | {
            theme?: 'Phantom'
            squad?: PhantomSquadType
          }
        | {
            theme: 'Mizuki'
            squad?: MizukiSquadType
          }
      )
    }
  | {
      type: 'Copilot'
      param: {
        enable?: boolean
        // filename: string
        // data: string
        // formation?: boolean
      }
    }
  | {
      type: 'SSSCopilot'
      param: {
        enable?: boolean
        // filename: string
        // data: string
        loop_times: number
      }
    }
  | {
      type: 'Depot'
      param: {
        enable?: boolean
      }
    }
  | {
      type: 'OperBox'
      param: {
        enable?: boolean
      }
    }
  | {
      type: 'ReclamationAlgorithm'
      param: {
        enable?: boolean
        mode: 0 | 1
      }
    }
  | {
      type: 'Custom'
      param: {
        enable?: boolean
        task_names: string[]
      }
    }
  | {
      type: 'VideoRecognition'
      param: {
        enable?: boolean
        // filename: string
        data: string
      }
    }
)

export type Start = {
  uuid: string
}

export type Stop = {
  uuid: string
}

export type Connect = {
  uuid: string
  address: string
  config: 'BlueStacks' | 'XYAZ' | 'Nox' | 'MuMuEmulator' | 'LDPlayer'
}

export type Click = {
  uuid: string
  x: number
  y: number
}

export type Screencap = {
  uuid: string
}

export type GetImage = {
  uuid: string
}

export type Version = {}

export type Log = {
  level: string
  message: string
}
