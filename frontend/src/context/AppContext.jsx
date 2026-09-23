/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const API_ROOT = import.meta.env.VITE_API_ROOT ?? 'http://localhost:8000'
const API_BASE = `${API_ROOT}/api`
const AUTH_BASE = `${API_ROOT}/api/auth`

const detectDemoMode = () => {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return window.location.protocol === 'file:' || params.has('demo')
}

const demoData = {
  me: {
    id: 1,
    username: 'demo_user',
    email: 'demo@tradecraft.local',
    phone: '+91 98765 43210',
    bio: 'Exploring the TradeCraft frontend in offline mode.',
    time_credits: 6.5,
  },
  listings: [
    {
      id: 1,
      title: 'Product design critique',
      description: '30-minute async review of your Figma or product spec.',
      location: 'Remote',
      price_rupees: '1500.00',
      price_timecredits: '1.5',
      created_at: new Date().toISOString(),
      provider: { username: 'designmind' },
    },
    {
      id: 2,
      title: 'Career planning call',
      description: '1:1 discussion on transitioning to backend engineering roles.',
      location: 'Hybrid / Bengaluru',
      price_rupees: '0.00',
      price_timecredits: '2.0',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      provider: { username: 'mentor_avi' },
    },
    {
      id: 3,
      title: 'Freelance invoicing template',
      description: 'Share of my Notion template + walkthrough on using it effectively.',
      location: 'Remote',
      price_rupees: '600.00',
      price_timecredits: null,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      provider: { username: 'opsbuddy' },
    },
  ],
  transactions: [
    {
      id: 201,
      listing: { title: 'Product design critique' },
      payment_method: 'TC',
      buyer: { id: 1, username: 'demo_user' },
      seller: { id: 2, username: 'designmind' },
      seller_verified: true,
      buyer_txn_id: null,
    },
    {
      id: 202,
      listing: { title: 'Career planning call' },
      payment_method: 'UPI',
      buyer: { id: 1, username: 'demo_user' },
      seller: { id: 3, username: 'mentor_avi' },
      seller_verified: false,
      buyer_txn_id: null,
    },
  ],
}

const AppContext = createContext(null)

const buildEndpoint = (path, base) => {
  if (path.startsWith('http')) return path
  const prefix = base ?? API_BASE
  return `${prefix}${path}`
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider')
  }
  return context
}

export function AppProvider({ children }) {
  const demoMode = useMemo(() => detectDemoMode(), [])
  const initialToken = useMemo(() => {
    if (demoMode) return null
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem('tc_token')
  }, [demoMode])

  const initialRefreshToken = useMemo(() => {
    if (demoMode) return null
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem('tc_refresh')
  }, [demoMode])

  const [token, setToken] = useState(initialToken)
  const [refreshToken, setRefreshToken] = useState(initialRefreshToken)
  const [listings, setListings] = useState([])
  const [transactions, setTransactions] = useState([])
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [chatState, setChatState] = useState({
    isOpen: false,
    listing: null,
    room: null,
    messages: [],
    loading: false,
  })
  const toastTimeout = useRef()
  const chatPollRef = useRef()

  const isAuthenticated = Boolean(token)

  const notify = useCallback((message, variant = 'info') => {
    setToast({ message, variant })
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current)
    }
    toastTimeout.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const apiRequest = useCallback(
    async (path, options = {}) => {
      const { method = 'GET', body, auth = true, base } = options
      const endpoint = buildEndpoint(path, base)

      const headers = { ...(options.headers || {}) }
      let payload = body

      if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
        payload = JSON.stringify(body)
      }

      if (auth && token) {
        headers.Authorization = `Bearer ${token}`
      }

      let response = await fetch(endpoint, {
        method,
        headers,
        body: payload,
      })

      // If access token expired (401), attempt refresh and retry once
      if (response.status === 401 && auth && refreshToken && !path.includes('/auth/')) {
        try {
          const refreshRes = await fetch(`${AUTH_BASE}/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          })
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json()
            const newAccess = refreshData.access
            const newRefresh = refreshData.refresh || refreshToken

            setToken(newAccess)
            setRefreshToken(newRefresh)
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('tc_token', newAccess)
              window.localStorage.setItem('tc_refresh', newRefresh)
            }

            // Retry original request with new token
            headers.Authorization = `Bearer ${newAccess}`
            response = await fetch(endpoint, {
              method,
              headers,
              body: payload,
            })
          } else {
            // Refresh token expired or blacklisted -> force sign out
            setToken(null)
            setRefreshToken(null)
            setProfile(null)
            setTransactions([])
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('tc_token')
              window.localStorage.removeItem('tc_refresh')
            }
          }
        } catch {
          // Ignore network errors on refresh and proceed with error handling
        }
      }

      const text = await response.text()
      let data
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        let errorMessage = 'Request failed'
        if (data?.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        } else if (data?.detail) {
          errorMessage = data.detail
        } else if (data?.non_field_errors && Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors[0]
        } else if (typeof data === 'object') {
          const firstFieldError = Object.values(data)[0]
          if (Array.isArray(firstFieldError) && firstFieldError.length > 0) {
            errorMessage = firstFieldError[0]
          } else if (typeof firstFieldError === 'string') {
            errorMessage = firstFieldError
          }
        }
        const error = new Error(errorMessage)
        error.status = response.status
        error.data = data
        throw error
      }

      return data
    },
    [token, refreshToken],
  )

  const loadDemoData = useCallback(
    (forceAuthenticated = isAuthenticated) => {
    setListings(demoData.listings)
      if (forceAuthenticated) {
        setProfile(demoData.me)
        setTransactions(demoData.transactions)
      } else {
        setProfile(null)
        setTransactions([])
      }
    },
    [isAuthenticated],
  )

  const refreshData = useCallback(async () => {
    if (demoMode) {
      loadDemoData()
      return
    }

    setIsLoading(true)
    try {
      const [listingData, profileData, txnData] = await Promise.all([
        apiRequest('/listings/', { auth: false }),
        isAuthenticated ? apiRequest('/user/me/') : Promise.resolve(null),
        isAuthenticated ? apiRequest('/transactions/') : Promise.resolve([]),
      ])

      // Handle listings - could be array or paginated response
      const listingsArray = Array.isArray(listingData) ? listingData : (listingData?.results || [])
      setListings(listingsArray)
      setProfile(profileData)
      // Handle transactions - could be array or paginated response
      const transactionsArray = Array.isArray(txnData) ? txnData : (txnData?.results || [])
      setTransactions(transactionsArray)
    } catch (error) {
      notify(error.message || 'Failed to load data', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [apiRequest, isAuthenticated, demoMode, loadDemoData, notify])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const registerUser = useCallback(
    async (payload) => {
      if (demoMode) {
        notify('Registration is disabled in demo mode.', 'info')
        return
      }
      try {
        await apiRequest('/users/register/', {
          method: 'POST',
          body: payload,
          auth: false,
        })
        notify('Account created! You can sign in now.', 'success')
      } catch (error) {
        const errorMessage = error.message || 'Registration failed. Please try again.'
        notify(errorMessage, 'error')
        throw error
      }
    },
    [apiRequest, demoMode, notify],
  )

  const loginUser = useCallback(
    async (payload) => {
      if (demoMode) {
        setToken('demo-token')
        setRefreshToken('demo-refresh')
        notify('Demo sign-in complete.', 'success')
        loadDemoData(true)
        return
      }

      try {
        const data = await apiRequest('/login/', {
          method: 'POST',
          body: payload,
          auth: false,
          base: AUTH_BASE,
        })

        if (!data || !data.access) {
          throw new Error('Invalid response from server. Please try again.')
        }

        setToken(data.access)
        if (data.refresh) {
          setRefreshToken(data.refresh)
        }
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('tc_token', data.access)
          if (data.refresh) {
            window.localStorage.setItem('tc_refresh', data.refresh)
          }
        }
        notify('Signed in successfully.', 'success')
        await refreshData()
      } catch (error) {
        const errorMessage = error.message || 'Sign in failed. Please check your credentials and try again.'
        notify(errorMessage, 'error')
        throw error
      }
    },
    [apiRequest, demoMode, loadDemoData, notify, refreshData],
  )

  const logout = useCallback(async () => {
    const currentRefresh = refreshToken || (typeof window !== 'undefined' ? window.localStorage.getItem('tc_refresh') : null)
    if (currentRefresh && !demoMode) {
      try {
        await apiRequest('/logout/', {
          method: 'POST',
          body: { refresh: currentRefresh },
          base: AUTH_BASE,
        })
      } catch {
        // Ignore errors during remote token invalidation
      }
    }

    setToken(null)
    setRefreshToken(null)
    setProfile(null)
    setTransactions([])
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('tc_token')
      window.localStorage.removeItem('tc_refresh')
    }
    notify('Signed out.', 'info')
    if (demoMode) {
      loadDemoData(false)
    }
  }, [apiRequest, demoMode, loadDemoData, notify, refreshToken])

  const createListing = useCallback(
    async (payload) => {
      if (!isAuthenticated) {
        notify('Sign in to create listings.', 'error')
        return
      }
      if (demoMode) {
        notify('Listing creation is disabled in demo mode.', 'info')
        return
      }
      await apiRequest('/listings/', {
        method: 'POST',
        body: payload,
      })
      notify('Listing published!', 'success')
      refreshData()
    },
    [apiRequest, demoMode, isAuthenticated, notify, refreshData],
  )

  const updateProfile = useCallback(
    async (payload) => {
      if (!isAuthenticated) {
        notify('Sign in to update profile.', 'error')
        return
      }
      if (demoMode) {
        notify('Profile update is disabled in demo mode.', 'info')
        return
      }
      try {
        const updatedProfile = await apiRequest('/user/me/', {
          method: 'PUT',
          body: payload,
        })
        setProfile(updatedProfile)
        notify('Profile updated successfully!', 'success')
      } catch (error) {
        const errorMessage = error.message || 'Failed to update profile. Please try again.'
        notify(errorMessage, 'error')
        throw error
      }
    },
    [apiRequest, demoMode, isAuthenticated, notify],
  )

  const startTransaction = useCallback(
    async (listingId, paymentMethod) => {
      if (!isAuthenticated) {
        notify('Sign in to start transactions.', 'error')
        return
      }
      if (demoMode) {
        notify('Transactions are simulated only in demo mode.', 'info')
        return
      }
      await apiRequest('/transactions/', {
        method: 'POST',
        body: { listing: listingId, payment_method: paymentMethod },
      })
      notify(`Transaction started via ${paymentMethod}.`, 'success')
      refreshData()
    },
    [apiRequest, demoMode, isAuthenticated, notify, refreshData],
  )

  const submitTxnId = useCallback(
    async (transactionId, reference) => {
      if (demoMode) {
        notify('UPI submission is disabled in demo mode.', 'info')
        return
      }
      await apiRequest(`/transactions/${transactionId}/submit_txnid/`, {
        method: 'POST',
        body: { buyer_txn_id: reference },
      })
      notify('Transaction reference submitted.', 'success')
      refreshData()
    },
    [apiRequest, demoMode, notify, refreshData],
  )

  const verifyTransaction = useCallback(
    async (transactionId) => {
      if (demoMode) {
        notify('Verification is disabled in demo mode.', 'info')
        return
      }
      await apiRequest(`/transactions/${transactionId}/verify/`, {
        method: 'POST',
      })
      notify('Transaction verified.', 'success')
      refreshData()
    },
    [apiRequest, demoMode, notify, refreshData],
  )

  const rejectTransaction = useCallback(
    async (transactionId) => {
      if (demoMode) {
        notify('Rejection is disabled in demo mode.', 'info')
        return
      }
      await apiRequest(`/transactions/${transactionId}/reject/`, {
        method: 'POST',
      })
      notify('Transaction rejected.', 'info')
      refreshData()
    },
    [apiRequest, demoMode, notify, refreshData],
  )

  const stats = useMemo(
    () => ({
      listings: listings.length,
      transactions: transactions.length,
      timeCredits: profile?.time_credits ?? 0,
    }),
    [listings.length, profile?.time_credits, transactions.length],
  )

  // Fetch chat thread: if user is buyer or seller in a transaction, use transaction-based chat
  const fetchChatThread = useCallback(
    async (listingId) => {
      // Listing chats are public; seller dashboard passes buyer_id separately
      return apiRequest(`/chat/listing/${listingId}/thread/`)
    },
    [apiRequest],
  )

  const stopChatPolling = useCallback(() => {
    if (chatPollRef.current) {
      clearInterval(chatPollRef.current)
      chatPollRef.current = null
    }
  }, [])

  const openChatForListing = useCallback(
    async (listing) => {
      if (!isAuthenticated) {
        notify('Sign in to chat with sellers.', 'error')
        return
      }
      try {
        setChatState((prev) => ({
          ...prev,
          isOpen: true,
          listing,
          loading: true,
        }))
        let data
        try {
          data = await fetchChatThread(listing.id)
        } catch (err) {
          // If forbidden (403), fall back to public listing chat
          if (err.status === 403) {
            data = await apiRequest(`/chat/listing/${listing.id}/thread/`)
            notify('You are not part of this transaction. Showing public chat.', 'info')
          } else {
            throw err
          }
        }
        // Determine if this is a transaction-based chat
        let transactionId = data.transaction ?? null
        let partner = null
        if (transactionId && transactions.length > 0) {
          const txn = transactions.find((t) => t.id === transactionId)
          if (txn && profile) {
            partner = txn.buyer?.id === profile.id ? txn.seller : txn.buyer
          }
        } else {
          // No transaction: partner is the seller/provider for listing
          partner = listing.provider || null
        }

        setChatState({
          isOpen: true,
          listing,
          room: data.room,
          messages: data.messages,
          loading: false,
          transaction: transactionId,
          partner,
        })
        stopChatPolling()
        // Poll for new messages
        chatPollRef.current = setInterval(async () => {
          try {
            const refreshed = await fetchChatThread(listing.id)
            setChatState((prev) => ({
              ...prev,
              messages: refreshed.messages,
              room: refreshed.room,
            }))
          } catch (error) {
            // If forbidden, stop polling
            if (error.status === 403) stopChatPolling()
            console.error(error)
          }
        }, 3000)
      } catch (error) {
        notify(error.message || 'Unable to load chat.', 'error')
        setChatState({
          isOpen: false,
          listing: null,
          room: null,
          messages: [],
          loading: false,
        })
      }
    },
    [fetchChatThread, isAuthenticated, notify, stopChatPolling, apiRequest],
  )

  const closeChat = useCallback(() => {
    stopChatPolling()
    setChatState({
      isOpen: false,
      listing: null,
      room: null,
      messages: [],
      loading: false,
    })
  }, [stopChatPolling])

  const sendChatMessage = useCallback(
    async (message) => {
      if (!chatState.listing) return
      const trimmed = message.trim()
      if (!trimmed) {
        notify('Type a message before sending.', 'info')
        return
      }
      try {
        // Prefer using current chat state's transaction if available
        let endpoint = `/chat/listing/${chatState.listing.id}/thread/`
        if (chatState.transaction) {
          endpoint = `/chat/transaction/${chatState.transaction}/thread/`
        } else if (isAuthenticated && profile) {
          const txn = transactions.find(
            (t) => t.listing?.id === chatState.listing.id && (t.buyer?.id === profile.id || t.seller?.id === profile.id)
          )
          if (txn) {
            endpoint = `/chat/transaction/${txn.id}/thread/`
          }
        }
        const response = await apiRequest(endpoint, {
          method: 'POST',
          body: { message: trimmed },
        })
        setChatState((prev) => ({
          ...prev,
          messages: [...prev.messages, response],
        }))
      } catch (error) {
        notify(error.message || 'Unable to send message.', 'error')
      }
    },
    [apiRequest, chatState.listing, notify, isAuthenticated, profile, transactions],
  )

  useEffect(
    () => () => {
      stopChatPolling()
    },
    [stopChatPolling],
  )

  const value = {
    api: {
      registerUser,
      loginUser,
      logout,
      createListing,
      updateProfile,
      startTransaction,
      submitTxnId,
      verifyTransaction,
      rejectTransaction,
      refreshData,
      openChatForListing,
      closeChat,
      sendChatMessage,
      apiRequest,
    },
    state: {
      listings,
      transactions,
      profile,
      stats,
      isAuthenticated,
      demoMode,
      isLoading,
      toast,
      chat: chatState,
    },
    notify,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

